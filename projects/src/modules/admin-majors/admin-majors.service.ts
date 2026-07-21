import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { randomUUID } from 'node:crypto';
import { read, utils } from 'xlsx';
import type { PaginatedResult } from '../../common/shared';
import { Prisma } from '../../generated/prisma/client';
import { AdminMajorsRepository } from './admin-majors.repository';
import { CreateMajorDto } from './dto/create-major.dto';
import { GetMajorsQueryDto } from './dto/get-majors-query.dto';
import { UpdateMajorStatusDto } from './dto/update-major-status.dto';
import { UpdateMajorDto } from './dto/update-major.dto';
import {
  mapToAdminMajorResponse,
  normalizeMajorCode,
} from './mappers/admin-major.mapper';
import type { AdminMajorResponse } from './types/admin-major.types';

type ImportMajorRow = {
  rowNumber: number;
  code?: string;
  name?: string;
  facultyName?: string;
};

export type UploadedMajorExcelFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

export type ImportMajorsResult = {
  totalRows: number;
  successCount: number;
  createdCount: number;
  createdMajors: AdminMajorResponse[];
  failedCount: number;
  errors: Array<{ row: number; message: string }>;
};

export type ImportMajorsPreviewResponse = {
  importToken: string;
  expiresAt: Date;
  totalRows: number;
  successCount: number;
  previewCount: number;
  previewMajors: Array<{
    row: number;
    action: 'create';
    code: string;
    name: string;
    facultyId: string;
    facultyCode: string;
    facultyName: string;
    note: string | null;
  }>;
  failedCount: number;
  errors: Array<{ row: number; message: string }>;
};

type CachedMajorImportPlan = {
  expiresAt: number;
  totalRows: number;
  rows: Array<{
    code: string;
    name: string;
    facultyId: string;
    facultyCode: string;
    facultyName: string;
  }>;
};

const IMPORT_PREVIEW_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AdminMajorsService {
  private readonly importPreviewCache = new Map<
    string,
    CachedMajorImportPlan
  >();

  constructor(private readonly repository: AdminMajorsRepository) {}

  /** Lấy danh sách ngành có phân trang, tìm kiếm và lọc theo khoa. Mặc định chỉ lấy ngành chưa xóa mềm. */
  async findAll(
    query: GetMajorsQueryDto,
  ): Promise<PaginatedResult<AdminMajorResponse>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.MajorWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.facultyId ? { facultyId: query.facultyId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { faculty: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const { items, total } = await this.repository.findMany(
      where,
      skip,
      limit,
    );

    return {
      items: items.map(mapToAdminMajorResponse),
      page,
      limit,
      total,
    };
  }

  /** Xem chi tiết 1 ngành - cho phép xem cả ngành đã xóa mềm để phục vụ tra cứu/audit. */
  async findOne(id: string): Promise<AdminMajorResponse> {
    const major = await this.repository.findById(id);

    if (!major) {
      throw new NotFoundException('Không tìm thấy ngành học');
    }

    return mapToAdminMajorResponse(major);
  }

  async create(dto: CreateMajorDto): Promise<AdminMajorResponse> {
    await this.assertFacultyExists(dto.facultyId);
    const code = normalizeMajorCode(dto.code);
    await this.assertCodeAvailable(code);

    try {
      const major = await this.repository.create({
        code,
        name: dto.name.trim(),
        facultyId: dto.facultyId,
      });

      return mapToAdminMajorResponse(major);
    } catch (error) {
      this.handleKnownMajorError(error);
      throw error;
    }
  }

  async generateImportTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách ngành');

    sheet.columns = [
      { header: 'Mã ngành', key: 'code', width: 20 },
      { header: 'Tên ngành', key: 'name', width: 35 },
      { header: 'Tên khoa', key: 'facultyName', width: 35 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.addRow({
      code: 'CNTT01',
      name: 'Công nghệ phần mềm',
      facultyName: 'Công nghệ thông tin',
    });
    sheet.addRow({
      code: 'CNTT02',
      name: 'Hệ thống thông tin',
      facultyName: 'Công nghệ thông tin',
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importFromTemplate(
    fallbackFacultyId: string | undefined,
    file: UploadedMajorExcelFile | undefined,
  ): Promise<ImportMajorsPreviewResponse> {
    let fallbackFaculty:
      | { id: string; code: string; name: string }
      | null
      | undefined;

    if (fallbackFacultyId) {
      assertValidUuid(fallbackFacultyId, 'Mã khoa phải là UUID hợp lệ');
      fallbackFaculty = await this.repository.findActiveFacultyById(
        fallbackFacultyId,
      );

      if (!fallbackFaculty) {
        throw new NotFoundException('Không tìm thấy khoa');
      }
    }

    const rows = parseUploadedMajorFile(file);
    const errors: ImportMajorsResult['errors'] = [];
    const seenCodes = new Map<string, number>();
    const validRows: Array<{
      rowNumber: number;
      code: string;
      name: string;
      facultyName?: string;
    }> = [];

    for (const row of rows) {
      try {
        const code = normalizeMajorCode(row.code ?? '');
        const name = row.name?.trim() ?? '';
        const facultyName = row.facultyName?.trim();

        validateImportMajorRow(code, name, facultyName, fallbackFacultyId);

        const duplicateRow = seenCodes.get(code);
        if (duplicateRow !== undefined) {
          throw new BadRequestException(
            `Mã ngành bị trùng trong file với dòng ${duplicateRow}`,
          );
        }

        seenCodes.set(code, row.rowNumber);
        validRows.push({ rowNumber: row.rowNumber, code, name, facultyName });
      } catch (error) {
        errors.push({
          row: row.rowNumber,
          message:
            error instanceof Error ? error.message : 'Dòng dữ liệu không hợp lệ',
        });
      }
    }

    const facultyValues = [
      ...new Set(
        validRows
          .map((row) => row.facultyName)
          .filter((facultyName): facultyName is string =>
            Boolean(facultyName),
          ),
      ),
    ];
    const faculties =
      facultyValues.length > 0
        ? await this.repository.findActiveFacultiesByNamesOrCodes(facultyValues)
        : [];
    const facultiesByValue = new Map<
      string,
      { id: string; code: string; name: string }
    >();
    for (const faculty of faculties) {
      facultiesByValue.set(normalizeFacultyLookupValue(faculty.name), faculty);
      facultiesByValue.set(normalizeFacultyLookupValue(faculty.code), faculty);
    }

    for (const row of validRows) {
      if (!row.facultyName) {
        continue;
      }

      const faculty = facultiesByValue.get(
        normalizeFacultyLookupValue(row.facultyName),
      );
      if (!faculty) {
        errors.push({
          row: row.rowNumber,
          message: `Không tìm thấy khoa ${row.facultyName}`,
        });
      }
    }

    const existingMajors =
      validRows.length > 0
        ? await this.repository.findByCodes(validRows.map((row) => row.code))
        : [];
    const existingByCode = new Map(
      existingMajors.map((major) => [major.code, major]),
    );

    for (const row of validRows) {
      const existing = existingByCode.get(row.code);
      if (!existing) {
        continue;
      }

      errors.push({
        row: row.rowNumber,
        message: existing.deletedAt
          ? 'Mã ngành này đã thuộc về một ngành đã bị xóa mềm trước đó. Vui lòng dùng mã khác.'
          : 'Mã ngành đã tồn tại',
      });
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Import file thất bại',
        errors: errors.map((error) => ({
          field: `row ${error.row}`,
          error: error.message,
        })),
      });
    }

    const previewMajors = validRows.map((row) => {
      const faculty = row.facultyName
        ? facultiesByValue.get(normalizeFacultyLookupValue(row.facultyName))
        : fallbackFaculty;
      const facultyId = faculty?.id ?? fallbackFacultyId;

      if (!facultyId) {
        throw new BadRequestException('Không xác định được khoa của ngành');
      }

      if (!faculty) {
        throw new BadRequestException('Không xác định được thông tin khoa của ngành');
      }

      return {
        row: row.rowNumber,
        action: 'create' as const,
        code: row.code,
        name: row.name,
        facultyId,
        facultyCode: faculty.code,
        facultyName: faculty.name,
        note: 'Sẽ tạo ngành mới khi xác nhận',
      };
    });

    const importToken = randomUUID();
    const expiresAt = new Date(Date.now() + IMPORT_PREVIEW_TTL_MS);
    this.importPreviewCache.set(importToken, {
      expiresAt: expiresAt.getTime(),
      totalRows: rows.length,
      rows: previewMajors.map((row) => ({
        code: row.code,
        name: row.name,
        facultyId: row.facultyId,
        facultyCode: row.facultyCode,
        facultyName: row.facultyName,
      })),
    });

    return {
      importToken,
      expiresAt,
      totalRows: rows.length,
      successCount: previewMajors.length,
      previewCount: previewMajors.length,
      previewMajors,
      failedCount: 0,
      errors: [],
    };
  }

  async confirmImport(importToken: string): Promise<ImportMajorsResult> {
    const plan = this.importPreviewCache.get(importToken);

    if (!plan) {
      throw new BadRequestException('Phiên import không tồn tại hoặc đã được xác nhận');
    }

    if (plan.expiresAt <= Date.now()) {
      this.importPreviewCache.delete(importToken);
      throw new BadRequestException('Phiên import đã hết hạn, vui lòng tải lại file');
    }

    this.importPreviewCache.delete(importToken);

    try {
      await this.repository.createMany(
        plan.rows.map((row) => ({
          code: row.code,
          name: row.name,
          facultyId: row.facultyId,
        })),
      );

      const createdRecords = await this.repository.findByCodes(
        plan.rows.map((row) => row.code),
      );
      const createdByCode = new Map(
        createdRecords.map((record) => [record.code, record]),
      );
      const createdMajors = plan.rows
        .map((row) => createdByCode.get(row.code))
        .filter((record): record is NonNullable<typeof record> =>
          Boolean(record),
        )
        .map(mapToAdminMajorResponse);

      return {
        totalRows: plan.totalRows,
        successCount: createdMajors.length,
        createdCount: createdMajors.length,
        createdMajors,
        failedCount: 0,
        errors: [],
      };
    } catch (error) {
      this.handleKnownMajorError(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateMajorDto): Promise<AdminMajorResponse> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Chưa cung cấp thông tin cần cập nhật');
    }

    const current = await this.repository.findActiveById(id);
    if (!current) {
      throw new NotFoundException('Không tìm thấy ngành học');
    }

    if (dto.facultyId !== undefined) {
      await this.assertFacultyExists(dto.facultyId);
    }

    const nextCode =
      dto.code !== undefined ? normalizeMajorCode(dto.code) : undefined;

    if (nextCode !== undefined && nextCode !== current.code) {
      await this.assertCodeAvailable(nextCode);
    }

    try {
      const major = await this.repository.update(id, {
        ...(nextCode !== undefined && { code: nextCode }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.facultyId !== undefined && { facultyId: dto.facultyId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });

      return mapToAdminMajorResponse(major);
    } catch (error) {
      this.handleKnownMajorError(error);
      throw error;
    }
  }

  /** Giữ lại endpoint /status riêng cho tương thích ngược - chỉ đổi isActive. */
  async updateStatus(
    id: string,
    dto: UpdateMajorStatusDto,
  ): Promise<AdminMajorResponse> {
    const current = await this.repository.findActiveById(id);
    if (!current) {
      throw new NotFoundException('Không tìm thấy ngành học');
    }

    const major = await this.repository.update(id, {
      isActive: dto.isActive,
    });

    return mapToAdminMajorResponse(major);
  }

  /**
   * Xóa mềm ngành bằng cách cập nhật deletedAt + isActive=false.
   * Chặn xóa nếu ngành còn lớp học đang hoạt động, tránh để lớp "mồ côi"
   * tham chiếu tới 1 ngành đã bị xóa.
   */
  async remove(id: string): Promise<AdminMajorResponse> {
    const major = await this.repository.findActiveById(id);

    if (!major) {
      throw new NotFoundException('Không tìm thấy ngành học');
    }

    if (major._count.classes > 0) {
      throw new BadRequestException(
        'Không thể xóa ngành đang có lớp học hoạt động. Vui lòng ẩn hoặc xóa các lớp học trước.',
      );
    }

    const removed = await this.repository.softDelete(id);

    return mapToAdminMajorResponse(removed);
  }

  /** Kiểm tra khoa tồn tại và chưa xóa mềm trước khi gán cho ngành. */
  private async assertFacultyExists(facultyId: string): Promise<void> {
    const faculty = await this.repository.findActiveFacultyById(facultyId);

    if (!faculty) {
      throw new NotFoundException('Không tìm thấy khoa');
    }
  }

  /**
   * Kiểm tra mã ngành còn dùng được không - phân biệt trùng với ngành đang hoạt động
   * hay trùng với ngành đã xóa mềm (không tự động ghi đè/khôi phục bản ghi cũ).
   */
  private async assertCodeAvailable(code: string): Promise<void> {
    const existing = await this.repository.findByCode(code);

    if (!existing) {
      return;
    }

    if (existing.deletedAt) {
      throw new ConflictException(
        'Mã ngành này đã thuộc về một ngành đã bị xóa mềm trước đó. Vui lòng dùng mã khác.',
      );
    }

    throw new ConflictException('Mã ngành đã tồn tại');
  }

  private handleKnownMajorError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    if (error.code === 'P2002') {
      throw new ConflictException('Mã ngành đã tồn tại');
    }

    if (error.code === 'P2025') {
      throw new NotFoundException('Không tìm thấy ngành học');
    }
  }
}

function isExcelFile(file: UploadedMajorExcelFile) {
  const fileName = file.originalname.toLowerCase();
  return (
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    file.mimetype ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mimetype === 'application/vnd.ms-excel'
  );
}

function parseUploadedMajorFile(
  file: UploadedMajorExcelFile | undefined,
): ImportMajorRow[] {
  if (!file) {
    throw new BadRequestException('Vui lòng tải lên file Excel');
  }

  if (!isExcelFile(file)) {
    throw new BadRequestException('File import phải có định dạng .xlsx hoặc .xls');
  }

  const rows = parseMajorRows(file.buffer);
  if (rows.length === 0) {
    throw new BadRequestException('File Excel không có dữ liệu ngành');
  }

  return rows;
}

function parseMajorRows(buffer: Buffer): ImportMajorRow[] {
  const workbook = read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new BadRequestException('File Excel không có sheet dữ liệu');
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new BadRequestException('Không đọc được sheet dữ liệu trong file Excel');
  }

  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  return rows
    .map((row, index) => ({
      rowNumber: index + 2,
      ...normalizeImportMajorRow(row),
    }))
    .filter((row) => row.code || row.name);
}

function normalizeImportMajorRow(row: Record<string, unknown>) {
  const normalized: { code?: string; name?: string; facultyName?: string } = {};

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(key);
    const stringValue =
      value === null || value === undefined ? '' : String(value).trim();

    if (['ma_nganh', 'ma_chuyen_nganh', 'code', 'major_code'].includes(normalizedKey)) {
      normalized.code = stringValue;
      continue;
    }

    if (
      ['ten_nganh', 'ten_chuyen_nganh', 'name', 'major_name'].includes(
        normalizedKey,
      )
    ) {
      normalized.name = stringValue;
      continue;
    }

    if (
      [
        'ten_khoa',
        'ma_khoa',
        'khoa',
        'faculty',
        'faculty_name',
        'faculty_code',
      ].includes(normalizedKey)
    ) {
      normalized.facultyName = stringValue;
    }
  }

  return normalized;
}

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function validateImportMajorRow(
  code: string,
  name: string,
  facultyName: string | undefined,
  fallbackFacultyId: string | undefined,
): void {
  if (!code) {
    throw new BadRequestException('Mã ngành không được để trống');
  }

  if (code.length > 20) {
    throw new BadRequestException('Mã ngành không được vượt quá 20 ký tự');
  }

  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw new BadRequestException(
      'Mã ngành chỉ được chứa chữ in hoa, số, dấu gạch dưới hoặc gạch ngang',
    );
  }

  if (!name) {
    throw new BadRequestException('Tên ngành không được để trống');
  }

  if (name.length > 255) {
    throw new BadRequestException('Tên ngành không được vượt quá 255 ký tự');
  }

  if (!facultyName && !fallbackFacultyId) {
    throw new BadRequestException('Tên khoa không được để trống');
  }

  if (facultyName && facultyName.length > 255) {
    throw new BadRequestException('Tên khoa không được vượt quá 255 ký tự');
  }
}

function normalizeFacultyLookupValue(value: string): string {
  return value.trim().toLowerCase();
}

function assertValidUuid(value: string, message: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new BadRequestException(message);
  }
}
