import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { read, utils } from 'xlsx';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { UserRole, type PaginatedResult } from '../../common/shared';
import { AddClassStudentDto } from './dto/add-class-student.dto';
import { GetClassStudentsQueryDto } from './dto/get-class-students-query.dto';
import {
  adminClassStudentSelect,
  type AdminClassStudentRecord,
} from './selects/admin-class-student.select';
import type {
  AdminClassStudentResponse,
  ImportClassStudentsResult,
} from './types/admin-class-student.types';

type ImportRow = {
  rowNumber: number;
  email?: string;
  studentId?: string;
  studentCode?: string;
  classCode?: string;
};

type ManageableClassRecord = {
  id: string;
  code: string;
  name: string;
  major: { facultyId: string };
};

export type UploadedExcelFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

@Injectable()
export class AdminClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async findStudents(
    userId: string,
    role: UserRole,
    classId: string,
    query: GetClassStudentsQueryDto,
  ): Promise<PaginatedResult<AdminClassStudentResponse>> {
    await this.assertCanManageClass(userId, role, classId);

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where: Prisma.ClassStudentWhereInput = {
      classId,
      ...(search
        ? {
            OR: [
              { studentCode: { contains: search, mode: 'insensitive' } },
              { student: { email: { contains: search, mode: 'insensitive' } } },
              {
                student: {
                  fullName: { contains: search, mode: 'insensitive' },
                },
              },
              { student: { phone: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [students, total] = await Promise.all([
      this.prisma.classStudent.findMany({
        where,
        select: adminClassStudentSelect,
        orderBy: [{ enrolledAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.classStudent.count({ where }),
    ]);

    return {
      items: students.map(mapToAdminClassStudentResponse),
      page,
      limit,
      total,
    };
  }

  async addStudent(
    userId: string,
    role: UserRole,
    classId: string,
    dto: AddClassStudentDto,
  ): Promise<AdminClassStudentResponse> {
    await this.assertCanManageClass(userId, role, classId);
    await this.assertStudentExists(dto.studentId);
    await this.assertStudentCodeAvailableForStudent(
      dto.studentCode,
      dto.studentId,
    );

    const currentEnrollment = await this.prisma.classStudent.findFirst({
      where: { studentId: dto.studentId },
      select: { id: true, classId: true },
    });

    const enrollment = currentEnrollment
      ? await this.prisma.classStudent.update({
          where: { id: currentEnrollment.id },
          data: {
            classId,
            studentCode: dto.studentCode,
          },
          select: adminClassStudentSelect,
        })
      : await this.prisma.classStudent.create({
          data: {
            classId,
            studentId: dto.studentId,
            studentCode: dto.studentCode,
          },
          select: adminClassStudentSelect,
        });

    return mapToAdminClassStudentResponse(enrollment);
  }

  async removeStudent(
    userId: string,
    role: UserRole,
    classId: string,
    studentId: string,
  ): Promise<AdminClassStudentResponse> {
    await this.assertCanManageClass(userId, role, classId);

    const enrollment = await this.prisma.classStudent.findFirst({
      where: { classId, studentId },
      select: { ...adminClassStudentSelect },
    });

    if (!enrollment) {
      throw new NotFoundException('Không tìm thấy sinh viên trong lớp học');
    }

    const hasEvaluation = await this.prisma.evaluationForm.findFirst({
      where: { studentId, classId },
      select: { id: true },
    });

    if (hasEvaluation) {
      throw new BadRequestException(
        'Không thể xóa sinh viên khỏi lớp vì dữ liệu phiếu rèn luyện đã phát sinh.',
      );
    }

    await this.prisma.classStudent.delete({
      where: { id: enrollment.id },
      select: { id: true },
    });

    return mapToAdminClassStudentResponse(enrollment);
  }

  async importStudents(
    userId: string,
    role: UserRole,
    classId: string,
    file: UploadedExcelFile | undefined,
  ): Promise<ImportClassStudentsResult> {
    const classRecord = await this.assertCanManageClass(userId, role, classId);
    const rows = parseUploadedImportFile(file);

    return this.importParsedRows(rows, async (row) => {
      if (
        row.classCode &&
        !isSameClassInImportFile(row.classCode, classRecord.code, classRecord.name)
      ) {
        throw new BadRequestException(
          `Lớp trong file (${row.classCode}) không khớp với lớp đang import (${classRecord.code})`,
        );
      }

      return classRecord;
    });
  }

  async importStudentsFromTemplate(
    userId: string,
    role: UserRole,
    file: UploadedExcelFile | undefined,
  ): Promise<ImportClassStudentsResult> {
    const rows = parseUploadedImportFile(file);

    return this.importParsedRows(rows, async (row, tx) => {
      if (!row.classCode) {
        throw new BadRequestException('Thiếu lớp');
      }

      const classRecord = await tx.class.findFirst({
        where: {
          OR: [
            { code: { equals: row.classCode, mode: 'insensitive' } },
            { name: { equals: row.classCode, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          code: true,
          name: true,
          major: { select: { facultyId: true } },
        },
      });

      if (!classRecord) {
        throw new BadRequestException(`Không tìm thấy lớp ${row.classCode}`);
      }

      await this.assertCanManageClassRecord(userId, role, classRecord);
      return classRecord;
    });
  }

  async generateImportTemplate(): Promise<Buffer> {
    return this.buildImportTemplate('CNTT01');
  }

  private async importParsedRows(
    rows: ImportRow[],
    resolveClass: (
      row: ImportRow,
      tx: Prisma.TransactionClient,
    ) => Promise<ManageableClassRecord>,
  ): Promise<ImportClassStudentsResult> {
    const errors: ImportClassStudentsResult['errors'] = [];
    let successCount = 0;
    let skippedCount = 0;

    await this.prisma
      .$transaction(async (tx) => {
        for (const row of rows) {
          try {
            if (!row.studentId && !row.email) {
              throw new BadRequestException(
                'Thiếu mã sinh viên hệ thống hoặc email',
              );
            }

            const classRecord = await resolveClass(row, tx);
            const student = await tx.user.findFirst({
              where: {
                role: 'student',
                ...(row.studentId
                  ? { id: row.studentId }
                  : { email: row.email?.toLowerCase() }),
              },
              select: { id: true, email: true },
            });

            if (!student) {
              throw new BadRequestException(
                'Không tìm thấy sinh viên có sẵn trong hệ thống',
              );
            }

            const studentCode =
              row.studentCode ?? deriveStudentCodeFromEmail(student.email);
            if (!studentCode) {
              throw new BadRequestException(
                'Thiếu mã sinh viên. Vui lòng bổ sung cột "Mã sinh viên" hoặc dùng email có phần mã trước ký tự @ không quá 20 ký tự',
              );
            }

            const enrollmentByStudent = await tx.classStudent.findFirst({
              where: { studentId: student.id },
              select: { id: true, classId: true, studentCode: true },
            });

            if (
              enrollmentByStudent &&
              enrollmentByStudent.classId !== classRecord.id
            ) {
              throw new BadRequestException(
                'Sinh viên đã thuộc lớp khác, vui lòng chuyển lớp thủ công trước khi import',
              );
            }

            const enrollmentByCode = await tx.classStudent.findUnique({
              where: { studentCode },
              select: { id: true, classId: true, studentId: true },
            });

            if (enrollmentByCode && enrollmentByCode.studentId !== student.id) {
              throw new BadRequestException(
                'Mã sinh viên đã được sử dụng cho sinh viên khác',
              );
            }

            if (enrollmentByCode && enrollmentByCode.classId !== classRecord.id) {
              throw new BadRequestException(
                'Mã sinh viên đang thuộc lớp khác, vui lòng kiểm tra lại file import',
              );
            }

            if (enrollmentByStudent) {
              skippedCount += 1;
              continue;
            }

            await tx.classStudent.create({
              data: {
                classId: classRecord.id,
                studentId: student.id,
                studentCode,
              },
              select: { id: true },
            });
            successCount += 1;
          } catch (error) {
            errors.push({
              row: row.rowNumber,
              message:
                error instanceof Error
                  ? error.message
                  : 'Dòng dữ liệu không hợp lệ',
            });
          }
        }

        if (errors.length > 0) {
          throw new ImportValidationError();
        }
      })
      .catch((error) => {
        if (error instanceof ImportValidationError) {
          return;
        }

        throw error;
      });

    return {
      totalRows: rows.length,
      successCount: errors.length > 0 ? 0 : successCount,
      skippedCount: errors.length > 0 ? 0 : skippedCount,
      failedCount: errors.length,
      errors,
    };
  }

  private async buildImportTemplate(classCode: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách');

    sheet.columns = [
      { header: 'Mã sinh viên', key: 'studentCode', width: 15 },
      { header: 'Họ và tên', key: 'fullName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Số điện thoại', key: 'phone', width: 18 },
      { header: 'Lớp', key: 'className', width: 15 },
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
      studentCode: 'SV001',
      fullName: 'Nguyễn Văn A',
      email: 'vana@example.com',
      phone: '0901234567',
      className: classCode,
    });

    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async assertCanManageClass(
    userId: string,
    role: UserRole,
    classId: string,
  ) {
    const classRecord = await this.prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        code: true,
        name: true,
        major: { select: { facultyId: true } },
      },
    });

    if (!classRecord) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    await this.assertCanManageClassRecord(userId, role, classRecord);
    return classRecord;
  }

  private async assertCanManageClassRecord(
    userId: string,
    role: UserRole,
    classRecord: ManageableClassRecord,
  ) {
    if (role === UserRole.Admin) {
      return;
    }

    if (role !== UserRole.FacultyCouncil) {
      throw new ForbiddenException('Bạn không có quyền quản lý lớp học này');
    }

    const assignmentCount = await this.prisma.facultyCouncilAssignment.count({
      where: {
        userId,
        facultyId: classRecord.major.facultyId,
      },
    });

    if (assignmentCount === 0) {
      throw new ForbiddenException('Bạn không được phân công quản lý khoa này');
    }
  }

  private async assertStudentExists(studentId: string) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: 'student' },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên');
    }
  }

  private async assertStudentCodeAvailableForStudent(
    studentCode: string,
    studentId: string,
  ) {
    const existing = await this.prisma.classStudent.findUnique({
      where: { studentCode },
      select: { studentId: true },
    });

    if (existing && existing.studentId !== studentId) {
      throw new ConflictException('Mã sinh viên đã được sử dụng');
    }
  }
}

function mapToAdminClassStudentResponse(
  record: AdminClassStudentRecord,
): AdminClassStudentResponse {
  return {
    id: record.id,
    classId: record.classId,
    studentId: record.studentId,
    studentCode: record.studentCode,
    email: record.student.email,
    fullName: record.student.fullName,
    phone: record.student.phone,
    dateOfBirth: record.student.dateOfBirth,
    isActive: record.student.isActive,
    enrolledAt: record.enrolledAt,
  };
}

function isExcelFile(file: UploadedExcelFile) {
  const fileName = file.originalname.toLowerCase();
  return (
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    file.mimetype ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mimetype === 'application/vnd.ms-excel'
  );
}

function parseUploadedImportFile(file: UploadedExcelFile | undefined) {
  if (!file) {
    throw new BadRequestException('Vui lòng tải lên file Excel');
  }

  if (!isExcelFile(file)) {
    throw new BadRequestException('File import phải có định dạng .xlsx hoặc .xls');
  }

  const rows = parseImportRows(file.buffer);
  if (rows.length === 0) {
    throw new BadRequestException('File Excel không có dữ liệu sinh viên');
  }

  return rows;
}

function parseImportRows(buffer: Buffer): ImportRow[] {
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
    .map((row, index) => {
      const normalizedRow = normalizeImportRow(row);

      return {
        rowNumber: index + 2,
        studentId: getCellValue(normalizedRow, [
          'studentid',
          'student_id',
          'id',
          'masinhvienhethong',
        ]),
        email: getCellValue(normalizedRow, ['email', 'mail', 'gmail']),
        studentCode: getCellValue(normalizedRow, [
          'studentcode',
          'student_code',
          'masinhvien',
          'masv',
          'mssv',
        ]),
        classCode: getCellValue(normalizedRow, [
          'lop',
          'class',
          'classcode',
          'malop',
        ]),
      };
    })
    .filter((row) => row.studentId || row.email || row.studentCode || row.classCode);
}

function getCellValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  return undefined;
}

function normalizeImportRow(row: Record<string, unknown>) {
  return Object.entries(row).reduce<Record<string, unknown>>(
    (result, [key, value]) => {
      result[normalizeHeader(key)] = value;
      return result;
    },
    {},
  );
}

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

function normalizeComparableValue(value: string) {
  return normalizeHeader(value).replace(/_/g, '');
}

function isSameClassInImportFile(
  importedClass: string,
  classCode: string,
  className: string,
) {
  const imported = normalizeComparableValue(importedClass);
  return (
    imported === normalizeComparableValue(classCode) ||
    imported === normalizeComparableValue(className)
  );
}

function deriveStudentCodeFromEmail(email: string) {
  const localPart = email.split('@')[0]?.trim();

  if (!localPart || localPart.length > 20) {
    return undefined;
  }

  return localPart;
}

class ImportValidationError extends Error {}
