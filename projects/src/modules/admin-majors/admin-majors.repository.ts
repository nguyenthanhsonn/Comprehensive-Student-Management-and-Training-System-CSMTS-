import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import {
  adminMajorSelect,
  type AdminMajorRecord,
} from './selects/admin-major.select';

export type CreateMajorData = {
  code: string;
  name: string;
  facultyId: string;
};

export type UpdateMajorData = {
  code?: string;
  name?: string;
  facultyId?: string;
  isActive?: boolean;
};

/**
 * Repository thao tác trực tiếp với bảng Major qua Prisma.
 * Không chứa logic nghiệp vụ - mọi validate/quy tắc nằm ở AdminMajorsService.
 */
@Injectable()
export class AdminMajorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Tìm danh sách ngành theo bộ lọc, có phân trang. */
  async findMany(
    where: Prisma.MajorWhereInput,
    skip: number,
    take: number,
  ): Promise<{ items: AdminMajorRecord[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.major.findMany({
        where,
        select: adminMajorSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.major.count({ where }),
    ]);

    return { items, total };
  }

  /** Tìm 1 ngành theo id - cho phép xem cả ngành đã xóa mềm để phục vụ tra cứu/audit. */
  findById(id: string): Promise<AdminMajorRecord | null> {
    return this.prisma.major.findUnique({
      where: { id },
      select: adminMajorSelect,
    });
  }

  /** Tìm 1 ngành đang hoạt động (chưa xóa mềm) theo id - dùng cho update/delete. */
  findActiveById(id: string): Promise<AdminMajorRecord | null> {
    return this.prisma.major.findFirst({
      where: { id, deletedAt: null },
      select: adminMajorSelect,
    });
  }

  /**
   * Tìm ngành theo mã, không lọc deletedAt - để service tự phân biệt trùng với
   * bản ghi đang hoạt động hay bản ghi đã xóa mềm.
   */
  findByCode(
    code: string,
  ): Promise<{ id: string; deletedAt: Date | null } | null> {
    return this.prisma.major.findUnique({
      where: { code },
      select: { id: true, deletedAt: true },
    });
  }

  findByCodes(codes: string[]): Promise<AdminMajorRecord[]> {
    return this.prisma.major.findMany({
      where: { code: { in: codes } },
      select: adminMajorSelect,
    });
  }

  /** Kiểm tra khoa tồn tại và chưa xóa mềm - dùng validate facultyId khi tạo/sửa ngành. */
  findActiveFacultyById(
    facultyId: string,
  ): Promise<{ id: string; code: string; name: string } | null> {
    return this.prisma.faculty.findFirst({
      where: { id: facultyId, deletedAt: null },
      select: { id: true, code: true, name: true },
    });
  }

  findActiveFacultiesByNamesOrCodes(
    values: string[],
  ): Promise<Array<{ id: string; code: string; name: string }>> {
    return this.prisma.faculty.findMany({
      where: {
        deletedAt: null,
        OR: values.flatMap((value) => [
          { name: { equals: value, mode: 'insensitive' } },
          { code: { equals: value, mode: 'insensitive' } },
        ]),
      },
      select: { id: true, code: true, name: true },
    });
  }

  create(data: CreateMajorData): Promise<AdminMajorRecord> {
    return this.prisma.major.create({
      data,
      select: adminMajorSelect,
    });
  }

  createMany(data: CreateMajorData[]): Promise<Prisma.BatchPayload> {
    return this.prisma.major.createMany({ data });
  }

  update(id: string, data: UpdateMajorData): Promise<AdminMajorRecord> {
    return this.prisma.major.update({
      where: { id },
      data,
      select: adminMajorSelect,
    });
  }

  /** Xóa mềm ngành - set deletedAt=hiện tại và isActive=false, không xóa cứng khỏi CSDL. */
  softDelete(id: string): Promise<AdminMajorRecord> {
    return this.prisma.major.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: adminMajorSelect,
    });
  }
}
