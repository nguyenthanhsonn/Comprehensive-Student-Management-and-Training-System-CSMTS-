import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import {
  adminStudentSelect,
  type AdminStudentRecord,
} from './selects/admin-student.select';

export type AdminStudentFilter = {
  keyword?: string;
  classId?: string;
  facultyId?: string;
  majorId?: string;
};

export type CreateStudentData = {
  userId: string;
  studentCode: string;
  classId: string;
  phone?: string;
  dateOfBirth?: Date;
};

export type UpdateStudentData = {
  studentCode?: string;
  classId?: string;
  phone?: string;
  dateOfBirth?: Date;
};

/**
 * Repository thao tác trực tiếp với ClassStudent (đại diện "hồ sơ sinh viên") + User liên kết.
 * Không chứa logic nghiệp vụ — mọi validate/quy tắc nằm ở AdminStudentsService.
 */
@Injectable()
export class AdminStudentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Tìm danh sách hồ sơ sinh viên theo bộ lọc, có phân trang. Luôn loại hồ sơ đã xóa mềm. */
  async findMany(
    filter: AdminStudentFilter,
    skip: number,
    take: number,
  ): Promise<{ items: AdminStudentRecord[]; total: number }> {
    const where = this.buildWhere(filter);

    const [items, total] = await Promise.all([
      this.prisma.classStudent.findMany({
        where,
        select: adminStudentSelect,
        orderBy: { enrolledAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.classStudent.count({ where }),
    ]);

    return { items, total };
  }

  /** Tìm 1 hồ sơ sinh viên theo id (đã loại hồ sơ bị xóa mềm). */
  findById(id: string): Promise<AdminStudentRecord | null> {
    return this.prisma.classStudent.findFirst({
      where: { id, deletedAt: null },
      select: adminStudentSelect,
    });
  }

  /** Tìm hồ sơ theo mã sinh viên — dùng validate trùng khi tạo/sửa. */
  findByStudentCode(studentCode: string): Promise<{ id: string } | null> {
    return this.prisma.classStudent.findUnique({
      where: { studentCode },
      select: { id: true },
    });
  }

  /** Tìm hồ sơ sinh viên đang hoạt động của 1 user — dùng validate "tài khoản đã có hồ sơ". */
  findActiveByUserId(userId: string): Promise<{ id: string } | null> {
    return this.prisma.classStudent.findFirst({
      where: { studentId: userId, deletedAt: null },
      select: { id: true },
    });
  }

  /** Tìm user theo id kèm role — dùng validate tồn tại + đúng vai trò sinh viên. */
  findUserById(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: true },
    });
  }

  /** Kiểm tra lớp học có tồn tại không — dùng validate classId truyền lên. */
  findClassById(classId: string): Promise<{ id: string } | null> {
    return this.prisma.class.findUnique({
      where: { id: classId },
      select: { id: true },
    });
  }

  /**
   * Tạo hồ sơ sinh viên. Nếu có truyền phone/dateOfBirth, cập nhật luôn vào User
   * trong cùng 1 transaction để đảm bảo dữ liệu nhất quán.
   */
  create(data: CreateStudentData): Promise<AdminStudentRecord> {
    return this.prisma.$transaction(async (tx) => {
      if (data.phone !== undefined || data.dateOfBirth !== undefined) {
        await tx.user.update({
          where: { id: data.userId },
          data: {
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.dateOfBirth !== undefined && {
              dateOfBirth: data.dateOfBirth,
            }),
          },
        });
      }

      return tx.classStudent.create({
        data: {
          studentId: data.userId,
          studentCode: data.studentCode,
          classId: data.classId,
        },
        select: adminStudentSelect,
      });
    });
  }

  /** Cập nhật hồ sơ sinh viên — tương tự create, có thể đồng thời cập nhật User trong 1 transaction. */
  update(
    id: string,
    userId: string,
    data: UpdateStudentData,
  ): Promise<AdminStudentRecord> {
    return this.prisma.$transaction(async (tx) => {
      if (data.phone !== undefined || data.dateOfBirth !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.dateOfBirth !== undefined && {
              dateOfBirth: data.dateOfBirth,
            }),
          },
        });
      }

      return tx.classStudent.update({
        where: { id },
        data: {
          ...(data.studentCode !== undefined && {
            studentCode: data.studentCode,
          }),
          ...(data.classId !== undefined && { classId: data.classId }),
        },
        select: adminStudentSelect,
      });
    });
  }

  /** Xóa mềm hồ sơ sinh viên bằng cách cập nhật deletedAt — không đụng tới User. */
  async softDelete(id: string): Promise<void> {
    await this.prisma.classStudent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private buildWhere(filter: AdminStudentFilter): Prisma.ClassStudentWhereInput {
    const classFilter: Prisma.ClassWhereInput = {};

    if (filter.majorId) {
      classFilter.majorId = filter.majorId;
    }

    if (filter.facultyId) {
      classFilter.major = { facultyId: filter.facultyId };
    }

    return {
      deletedAt: null,
      ...(filter.classId && { classId: filter.classId }),
      ...((filter.majorId || filter.facultyId) && { class: classFilter }),
      ...(filter.keyword && {
        OR: [
          { studentCode: { contains: filter.keyword, mode: 'insensitive' } },
          {
            student: {
              fullName: { contains: filter.keyword, mode: 'insensitive' },
            },
          },
          {
            student: {
              phone: { contains: filter.keyword, mode: 'insensitive' },
            },
          },
          {
            student: {
              email: { contains: filter.keyword, mode: 'insensitive' },
            },
          },
        ],
      }),
    };
  }
}
