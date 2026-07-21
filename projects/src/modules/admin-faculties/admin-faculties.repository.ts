import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import {
  adminFacultySelect,
  type AdminFacultyRecord,
} from './selects/admin-faculty.select';

export type CreateFacultyData = {
  code: string;
  name: string;
};

export type UpdateFacultyData = {
  code?: string;
  name?: string;
  isActive?: boolean;
};

/**
 * Repository thao tác trực tiếp với bảng Faculty qua Prisma.
 * Không chứa logic nghiệp vụ - mọi validate/quy tắc nằm ở AdminFacultiesService.
 */
@Injectable()
export class AdminFacultiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Tìm danh sách khoa theo bộ lọc, có phân trang. */
  async findMany(
    where: Prisma.FacultyWhereInput,
    skip: number,
    take: number,
  ): Promise<{ items: AdminFacultyRecord[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.faculty.findMany({
        where,
        select: adminFacultySelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.faculty.count({ where }),
    ]);

    return { items, total };
  }

  /** Tìm 1 khoa theo id - cho phép xem cả khoa đã xóa mềm để phục vụ tra cứu/audit. */
  findById(id: string): Promise<AdminFacultyRecord | null> {
    return this.prisma.faculty.findUnique({
      where: { id },
      select: adminFacultySelect,
    });
  }

  /** Tìm 1 khoa đang hoạt động (chưa xóa mềm) theo id - dùng cho update/delete. */
  findActiveById(id: string): Promise<AdminFacultyRecord | null> {
    return this.prisma.faculty.findFirst({
      where: { id, deletedAt: null },
      select: adminFacultySelect,
    });
  }

  /**
   * Tìm khoa theo mã, không lọc deletedAt - để service tự phân biệt trùng với
   * bản ghi đang hoạt động hay bản ghi đã xóa mềm (trả message phù hợp cho từng trường hợp).
   */
  findByCode(
    code: string,
  ): Promise<{ id: string; deletedAt: Date | null } | null> {
    return this.prisma.faculty.findUnique({
      where: { code },
      select: { id: true, deletedAt: true },
    });
  }

  findByCodes(
    codes: string[],
  ): Promise<Array<AdminFacultyRecord & { code: string }>> {
    return this.prisma.faculty.findMany({
      where: { code: { in: codes } },
      select: adminFacultySelect,
    });
  }

  create(data: CreateFacultyData): Promise<AdminFacultyRecord> {
    return this.prisma.faculty.create({
      data,
      select: adminFacultySelect,
    });
  }

  createMany(data: CreateFacultyData[]): Promise<Prisma.BatchPayload> {
    return this.prisma.faculty.createMany({ data });
  }

  update(id: string, data: UpdateFacultyData): Promise<AdminFacultyRecord> {
    return this.prisma.faculty.update({
      where: { id },
      data,
      select: adminFacultySelect,
    });
  }

  /** Xóa mềm khoa - set deletedAt=hiện tại và isActive=false, không xóa cứng khỏi CSDL. */
  softDelete(id: string): Promise<AdminFacultyRecord> {
    return this.prisma.faculty.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: adminFacultySelect,
    });
  }
}
