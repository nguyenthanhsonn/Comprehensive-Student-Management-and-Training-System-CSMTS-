import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, UserRole } from '../../../generated/prisma/client';
import {
  adminUserDetailSelect,
  adminUserListSelect,
  type AdminUserDetailRecord,
  type AdminUserListRecord,
} from './selects/admin-user.select';

export type AdminUserFilter = {
  keyword?: string;
  role?: UserRole;
  isActive?: boolean;
};

/**
 * Repository thao tác trực tiếp với bảng User cho phạm vi quản trị (admin).
 * Không chứa logic nghiệp vụ — mọi validate/quy tắc nằm ở AdminUsersService.
 */
@Injectable()
export class AdminUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Tìm danh sách tài khoản theo bộ lọc, có phân trang. Luôn loại tài khoản đã xóa mềm. */
  async findMany(
    filter: AdminUserFilter,
    skip: number,
    take: number,
  ): Promise<{ items: AdminUserListRecord[]; total: number }> {
    const where = this.buildWhere(filter);

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: adminUserListSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  /** Tìm 1 tài khoản theo id (đã loại tài khoản bị xóa mềm). */
  findById(id: string): Promise<AdminUserDetailRecord | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: adminUserDetailSelect,
    });
  }

  /** Tìm 1 tài khoản theo email — dùng để validate trùng khi tạo mới. */
  findByEmail(email: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  /** Tạo tài khoản mới. */
  create(data: Prisma.UserCreateInput): Promise<AdminUserDetailRecord> {
    return this.prisma.user.create({ data, select: adminUserDetailSelect });
  }

  /** Cập nhật thông tin cơ bản của tài khoản. */
  update(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<AdminUserDetailRecord> {
    return this.prisma.user.update({
      where: { id },
      data,
      select: adminUserDetailSelect,
    });
  }

  /** Xóa mềm tài khoản bằng cách cập nhật deletedAt — không xóa cứng khỏi DB. */
  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Khóa tài khoản — set isActive=false và ghi nhận thời điểm khóa. */
  lock(id: string): Promise<AdminUserDetailRecord> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false, lockedAt: new Date() },
      select: adminUserDetailSelect,
    });
  }

  /** Mở khóa tài khoản — set isActive=true và xóa thời điểm khóa. */
  unlock(id: string): Promise<AdminUserDetailRecord> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true, lockedAt: null },
      select: adminUserDetailSelect,
    });
  }

  /** Cập nhật vai trò tài khoản. */
  updateRole(id: string, role: UserRole): Promise<AdminUserDetailRecord> {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: adminUserDetailSelect,
    });
  }

  private buildWhere(filter: AdminUserFilter): Prisma.UserWhereInput {
    return {
      deletedAt: null,
      ...(filter.role && { role: filter.role }),
      ...(filter.isActive !== undefined && { isActive: filter.isActive }),
      ...(filter.keyword && {
        OR: [
          { fullName: { contains: filter.keyword, mode: 'insensitive' } },
          { email: { contains: filter.keyword, mode: 'insensitive' } },
          { phone: { contains: filter.keyword, mode: 'insensitive' } },
        ],
      }),
    };
  }
}
