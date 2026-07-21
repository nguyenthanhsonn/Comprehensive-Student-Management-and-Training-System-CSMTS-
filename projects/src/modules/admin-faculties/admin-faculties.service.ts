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
import { AdminFacultiesRepository } from './admin-faculties.repository';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { GetFacultiesQueryDto } from './dto/get-faculties-query.dto';
import { UpdateFacultyStatusDto } from './dto/update-faculty-status.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';
import {
  mapToAdminFacultyResponse,
  normalizeFacultyCode,
} from './mappers/admin-faculty.mapper';
import type { AdminFacultyResponse } from './types/admin-faculty.types';

type ImportFacultyRow = {
  rowNumber: number;
  code?: string;
  name?: string;
};

export type UploadedFacultyExcelFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

export type ImportFacultiesResult = {
  totalRows: number;
  successCount: number;
  createdCount: number;
  createdFaculties: AdminFacultyResponse[];
  failedCount: number;
  errors: Array<{ row: number; message: string }>;
};

export type ImportFacultiesPreviewResponse = {
  importToken: string;
  expiresAt: Date;
  totalRows: number;
  successCount: number;
  previewCount: number;
  previewFaculties: Array<{
    row: number;
    action: 'create';
    code: string;
    name: string;
    note: string | null;
  }>;
  failedCount: number;
  errors: Array<{ row: number; message: string }>;
};

type CachedFacultyImportPlan = {
  expiresAt: number;
  totalRows: number;
  rows: Array<{ code: string; name: string }>;
};

const IMPORT_PREVIEW_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AdminFacultiesService {
  private readonly importPreviewCache = new Map<
    string,
    CachedFacultyImportPlan
  >();

  constructor(private readonly repository: AdminFacultiesRepository) {}

  /** Lấy danh sách khoa có phân trang, tìm kiếm và lọc. Mặc định chỉ lấy khoa chưa xóa mềm. */
  async findAll(
    query: GetFacultiesQueryDto,
  ): Promise<PaginatedResult<AdminFacultyResponse>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.FacultyWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
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
      items: items.map(mapToAdminFacultyResponse),
      page,
      limit,
      total,
    };
  }

  /** Xem chi tiết 1 khoa - cho phép xem cả khoa đã xóa mềm để phục vụ tra cứu/audit. */
  async findOne(id: string): Promise<AdminFacultyResponse> {
    const faculty = await this.repository.findById(id);

    if (!faculty) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    return mapToAdminFacultyResponse(faculty);
  }

  async create(dto: CreateFacultyDto): Promise<AdminFacultyResponse> {
    const code = normalizeFacultyCode(dto.code);
    await this.assertCodeAvailable(code);

    try {
      const faculty = await this.repository.create({
        code,
        name: dto.name.trim(),
      });

      return mapToAdminFacultyResponse(faculty);
    } catch (error) {
      this.handleKnownFacultyError(error);
      throw error;
    }
  }

  async generateImportTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách khoa');

    sheet.columns = [
      { header: 'Mã khoa', key: 'code', width: 20 },
      { header: 'Tên khoa', key: 'name', width: 35 },
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
      code: 'CNTT',
      name: 'Công nghệ thông tin',
    });
    sheet.addRow({
      code: 'KT',
      name: 'Kinh tế',
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importFromTemplate(
    file: UploadedFacultyExcelFile | undefined,
  ): Promise<ImportFacultiesPreviewResponse> {
    const rows = parseUploadedFacultyFile(file);
    const errors: ImportFacultiesResult['errors'] = [];
    const seenCodes = new Map<string, number>();
    const validRows: Array<{ rowNumber: number; code: string; name: string }> =
      [];

    for (const row of rows) {
      try {
        const code = normalizeFacultyCode(row.code ?? '');
        const name = row.name?.trim() ?? '';

        validateImportFacultyRow(row.rowNumber, code, name);

        const duplicateRow = seenCodes.get(code);
        if (duplicateRow !== undefined) {
          throw new BadRequestException(
            `Mã khoa bị trùng trong file với dòng ${duplicateRow}`,
          );
        }

        seenCodes.set(code, row.rowNumber);
        validRows.push({ rowNumber: row.rowNumber, code, name });
      } catch (error) {
        errors.push({
          row: row.rowNumber,
          message:
            error instanceof Error ? error.message : 'Dòng dữ liệu không hợp lệ',
        });
      }
    }

    const existingFaculties =
      validRows.length > 0
        ? await this.repository.findByCodes(validRows.map((row) => row.code))
        : [];
    const existingByCode = new Map(
      existingFaculties.map((faculty) => [faculty.code, faculty]),
    );

    for (const row of validRows) {
      const existing = existingByCode.get(row.code);
      if (!existing) {
        continue;
      }

      errors.push({
        row: row.rowNumber,
        message: existing.deletedAt
          ? 'Mã khoa này đã thuộc về một khoa đã bị xóa mềm trước đó. Vui lòng dùng mã khác.'
          : 'Mã khoa đã tồn tại',
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

    const importToken = randomUUID();
    const expiresAt = new Date(Date.now() + IMPORT_PREVIEW_TTL_MS);
    const previewFaculties = validRows.map((row) => ({
      row: row.rowNumber,
      action: 'create' as const,
      code: row.code,
      name: row.name,
      note: 'Sẽ tạo khoa mới khi xác nhận',
    }));

    this.importPreviewCache.set(importToken, {
      expiresAt: expiresAt.getTime(),
      totalRows: rows.length,
      rows: validRows.map((row) => ({ code: row.code, name: row.name })),
    });

    return {
      importToken,
      expiresAt,
      totalRows: rows.length,
      successCount: previewFaculties.length,
      previewCount: previewFaculties.length,
      previewFaculties,
      failedCount: 0,
      errors: [],
    };
  }

  async confirmImport(importToken: string): Promise<ImportFacultiesResult> {
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
      await this.repository.createMany(plan.rows);

      const createdRecords = await this.repository.findByCodes(
        plan.rows.map((row) => row.code),
      );
      const createdByCode = new Map(
        createdRecords.map((record) => [record.code, record]),
      );
      const createdFaculties = plan.rows
        .map((row) => createdByCode.get(row.code))
        .filter((record): record is NonNullable<typeof record> => Boolean(record))
        .map(mapToAdminFacultyResponse);

      return {
        totalRows: plan.totalRows,
        successCount: createdFaculties.length,
        createdCount: createdFaculties.length,
        createdFaculties,
        failedCount: 0,
        errors: [],
      };
    } catch (error) {
      this.handleKnownFacultyError(error);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateFacultyDto,
  ): Promise<AdminFacultyResponse> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Chưa cung cấp thông tin cần cập nhật');
    }

    const current = await this.repository.findActiveById(id);
    if (!current) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    const nextCode =
      dto.code !== undefined ? normalizeFacultyCode(dto.code) : undefined;

    if (nextCode !== undefined && nextCode !== current.code) {
      await this.assertCodeAvailable(nextCode);
    }

    try {
      const faculty = await this.repository.update(id, {
        ...(nextCode !== undefined && { code: nextCode }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });

      return mapToAdminFacultyResponse(faculty);
    } catch (error) {
      this.handleKnownFacultyError(error);
      throw error;
    }
  }

  /** Giữ lại endpoint /status riêng cho tương thích ngược - chỉ đổi isActive, không đổi code/name. */
  async updateStatus(
    id: string,
    dto: UpdateFacultyStatusDto,
  ): Promise<AdminFacultyResponse> {
    const current = await this.repository.findActiveById(id);
    if (!current) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    const faculty = await this.repository.update(id, {
      isActive: dto.isActive,
    });

    return mapToAdminFacultyResponse(faculty);
  }

  /**
   * Xóa mềm khoa bằng cách cập nhật deletedAt + isActive=false.
   * Chặn xóa nếu khoa còn ngành học đang hoạt động,
   * tránh để dữ liệu con "mồ côi" tham chiếu tới 1 khoa đã bị xóa.
   */
  async remove(id: string): Promise<AdminFacultyResponse> {
    const faculty = await this.repository.findActiveById(id);

    if (!faculty) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    if (faculty._count.majors > 0) {
      throw new BadRequestException(
        'Không thể xóa khoa đang có ngành học hoạt động. Vui lòng ẩn hoặc xóa các ngành học trước.',
      );
    }

    const removed = await this.repository.softDelete(id);

    return mapToAdminFacultyResponse(removed);
  }

  /**
   * Kiểm tra mã khoa còn dùng được không - phân biệt rõ 2 trường hợp: trùng với khoa
   * đang hoạt động (Conflict thông thường) hay trùng với khoa đã xóa mềm (Conflict kèm
   * gợi ý rõ ràng, không tự động ghi đè/khôi phục bản ghi cũ).
   */
  private async assertCodeAvailable(code: string): Promise<void> {
    const existing = await this.repository.findByCode(code);

    if (!existing) {
      return;
    }

    if (existing.deletedAt) {
      throw new ConflictException(
        'Mã khoa này đã thuộc về một khoa đã bị xóa mềm trước đó. Vui lòng dùng mã khác.',
      );
    }

    throw new ConflictException('Mã khoa đã tồn tại');
  }

  private handleKnownFacultyError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    if (error.code === 'P2002') {
      throw new ConflictException('Mã khoa đã tồn tại');
    }

    if (error.code === 'P2025') {
      throw new NotFoundException('Không tìm thấy khoa');
    }
  }
}

function isExcelFile(file: UploadedFacultyExcelFile) {
  const fileName = file.originalname.toLowerCase();
  return (
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    file.mimetype ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mimetype === 'application/vnd.ms-excel'
  );
}

function parseUploadedFacultyFile(
  file: UploadedFacultyExcelFile | undefined,
): ImportFacultyRow[] {
  if (!file) {
    throw new BadRequestException('Vui lòng tải lên file Excel');
  }

  if (!isExcelFile(file)) {
    throw new BadRequestException('File import phải có định dạng .xlsx hoặc .xls');
  }

  const rows = parseFacultyRows(file.buffer);
  if (rows.length === 0) {
    throw new BadRequestException('File Excel không có dữ liệu khoa');
  }

  return rows;
}

function parseFacultyRows(buffer: Buffer): ImportFacultyRow[] {
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
      ...normalizeImportFacultyRow(row),
    }))
    .filter((row) => row.code || row.name);
}

function normalizeImportFacultyRow(row: Record<string, unknown>) {
  const normalized: { code?: string; name?: string } = {};

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(key);
    const stringValue =
      value === null || value === undefined ? '' : String(value).trim();

    if (['ma_khoa', 'code', 'faculty_code'].includes(normalizedKey)) {
      normalized.code = stringValue;
      continue;
    }

    if (['ten_khoa', 'name', 'faculty_name'].includes(normalizedKey)) {
      normalized.name = stringValue;
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

function validateImportFacultyRow(
  rowNumber: number,
  code: string,
  name: string,
): void {
  if (!code) {
    throw new BadRequestException('Mã khoa không được để trống');
  }

  if (code.length > 20) {
    throw new BadRequestException('Mã khoa không được vượt quá 20 ký tự');
  }

  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw new BadRequestException(
      'Mã khoa chỉ được chứa chữ in hoa, số, dấu gạch dưới hoặc gạch ngang',
    );
  }

  if (!name) {
    throw new BadRequestException('Tên khoa không được để trống');
  }

  if (name.length > 255) {
    throw new BadRequestException('Tên khoa không được vượt quá 255 ký tự');
  }
}
