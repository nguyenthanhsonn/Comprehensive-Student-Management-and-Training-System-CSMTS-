import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import {
  adminClassCatalogSelect,
  type AdminClassCatalogRecord,
} from './selects/admin-class-catalog.select';

export type CreateClassData = {
  code: string;
  name: string;
  majorId: string;
  enrollmentYear: number;
};

export type UpdateClassData = {
  code?: string;
  name?: string;
  majorId?: string;
  enrollmentYear?: number;
  isActive?: boolean;
};

/**
 * Repository thao tác trực tiếp với bảng Class (danh mục lớp) qua Prisma.
 * Không chứa logic nghiệp vụ - mọi validate/quy tắc nằm ở AdminClassCatalogService.
 * Tách biệt hoàn toàn với AdminClassesService (quản lý sinh viên trong lớp/import Excel).
 */
@Injectable()
export class AdminClassCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Tìm danh sách lớp theo bộ lọc, có phân trang. */
  async findMany(
    where: Prisma.ClassWhereInput,
    skip: number,
    take: number,
  ): Promise<{ items: AdminClassCatalogRecord[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        select: adminClassCatalogSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.class.count({ where }),
    ]);

    return { items, total };
  }

  /** Tìm 1 lớp theo id - cho phép xem cả lớp đã xóa mềm để phục vụ tra cứu/audit. */
  findById(id: string): Promise<AdminClassCatalogRecord | null> {
    return this.prisma.class.findUnique({
      where: { id },
      select: adminClassCatalogSelect,
    });
  }

  /** Tìm 1 lớp đang hoạt động (chưa xóa mềm) theo id - dùng cho update/delete. */
  findActiveById(id: string): Promise<AdminClassCatalogRecord | null> {
    return this.prisma.class.findFirst({
      where: { id, deletedAt: null },
      select: adminClassCatalogSelect,
    });
  }

  /**
   * Tìm lớp theo mã, không lọc deletedAt - để service tự phân biệt trùng với
   * bản ghi đang hoạt động hay bản ghi đã xóa mềm.
   */
  findByCode(
    code: string,
  ): Promise<{ id: string; deletedAt: Date | null } | null> {
    return this.prisma.class.findUnique({
      where: { code },
      select: { id: true, deletedAt: true },
    });
  }

  /** Kiểm tra ngành tồn tại và chưa xóa mềm - dùng validate majorId khi tạo/sửa lớp. */
  findActiveMajorById(majorId: string): Promise<{ id: string } | null> {
    return this.prisma.major.findFirst({
      where: { id: majorId, deletedAt: null },
      select: { id: true },
    });
  }

  create(data: CreateClassData): Promise<AdminClassCatalogRecord> {
    return this.prisma.class.create({
      data,
      select: adminClassCatalogSelect,
    });
  }

  update(id: string, data: UpdateClassData): Promise<AdminClassCatalogRecord> {
    return this.prisma.class.update({
      where: { id },
      data,
      select: adminClassCatalogSelect,
    });
  }

  /** Xóa mềm lớp - set deletedAt=hiện tại và isActive=false, không xóa cứng khỏi CSDL. */
  softDelete(id: string): Promise<AdminClassCatalogRecord> {
    return this.prisma.class.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: adminClassCatalogSelect,
    });
  }
}
