import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ADMIN_MESSAGES } from '../../../common/constants/message.constant';
import {
  buildPaginatedResult,
  calculateSkip,
} from '../../../common/helpers/pagination.helper';
import type { PaginatedResult } from '../../../common/types/pagination-result.type';
import {
  AdminUsersRepository,
  type AdminUserFilter,
} from './admin-users.repository';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { QueryAdminUserDto } from './dto/query-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import {
  mapToAdminUserDetail,
  mapToAdminUserListItem,
} from './helpers/admin-user.mapper';
import type {
  AdminUserDetail,
  AdminUserListItem,
} from './types/admin-user.types';
import type { AdminUserDetailRecord } from './selects/admin-user.select';

const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class AdminUsersService {
  constructor(private readonly adminUsersRepository: AdminUsersRepository) {}

  /**
   * Lấy danh sách tài khoản với phân trang và tìm kiếm.
   * Chỉ trả về các trường cần thiết để tránh lộ dữ liệu nhạy cảm.
   */
  async findMany(
    query: QueryAdminUserDto,
  ): Promise<PaginatedResult<AdminUserListItem>> {
    const skip = calculateSkip(query.page, query.limit);
    const filter: AdminUserFilter = {
      keyword: query.keyword,
      role: query.role,
      isActive: query.isLocked === undefined ? undefined : !query.isLocked,
    };

    const { items, total } = await this.adminUsersRepository.findMany(
      filter,
      skip,
      query.limit,
    );

    return buildPaginatedResult(
      items.map(mapToAdminUserListItem),
      total,
      query.page,
      query.limit,
    );
  }

  /** Xem chi tiết 1 tài khoản, không trả passwordHash. */
  async findById(id: string): Promise<AdminUserDetail> {
    const user = await this.assertExists(id);
    return mapToAdminUserDetail(user);
  }

  /**
   * Tạo tài khoản mới.
   * Validate email không trùng, hash password bằng bcrypt trước khi lưu.
   */
  async create(dto: CreateAdminUserDto): Promise<AdminUserDetail> {
    const existing = await this.adminUsersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(ADMIN_MESSAGES.EMAIL_EXISTS);
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);

    const user = await this.adminUsersRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      role: dto.role,
      phone: dto.phone ?? null,
    });

    return mapToAdminUserDetail(user);
  }

  /**
   * Cập nhật thông tin cơ bản của tài khoản.
   * Không cho sửa password/role ở đây — phải dùng endpoint riêng.
   */
  async update(id: string, dto: UpdateAdminUserDto): Promise<AdminUserDetail> {
    await this.assertExists(id);

    const user = await this.adminUsersRepository.update(id, {
      ...(dto.fullName !== undefined && { fullName: dto.fullName }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.dateOfBirth !== undefined && {
        dateOfBirth: new Date(dto.dateOfBirth),
      }),
    });

    return mapToAdminUserDetail(user);
  }

  /**
   * Xóa mềm tài khoản bằng cách cập nhật deletedAt.
   * Không xóa cứng dữ liệu khỏi cơ sở dữ liệu.
   */
  async softDelete(id: string): Promise<void> {
    await this.assertExists(id);
    await this.adminUsersRepository.softDelete(id);
  }

  /**
   * Khóa tài khoản người dùng.
   * Tài khoản bị khóa sẽ không thể đăng nhập vào hệ thống.
   */
  async lock(id: string): Promise<AdminUserDetail> {
    const current = await this.assertExists(id);

    if (!current.isActive) {
      throw new ConflictException(ADMIN_MESSAGES.USER_ALREADY_LOCKED);
    }

    const user = await this.adminUsersRepository.lock(id);
    return mapToAdminUserDetail(user);
  }

  /** Mở khóa tài khoản người dùng, cho phép đăng nhập trở lại. */
  async unlock(id: string): Promise<AdminUserDetail> {
    const current = await this.assertExists(id);

    if (current.isActive) {
      throw new ConflictException(ADMIN_MESSAGES.USER_NOT_LOCKED);
    }

    const user = await this.adminUsersRepository.unlock(id);
    return mapToAdminUserDetail(user);
  }

  /**
   * Cập nhật vai trò tài khoản.
   * Admin không được tự đổi vai trò của chính mình để tránh tự khóa quyền truy cập của bản thân.
   */
  async updateRole(
    id: string,
    dto: UpdateUserRoleDto,
    currentUserId: string,
  ): Promise<AdminUserDetail> {
    if (id === currentUserId) {
      throw new ForbiddenException(ADMIN_MESSAGES.CANNOT_CHANGE_OWN_ROLE);
    }

    await this.assertExists(id);
    const user = await this.adminUsersRepository.updateRole(id, dto.role);

    return mapToAdminUserDetail(user);
  }

  /** Đảm bảo tài khoản tồn tại (và chưa bị xóa mềm) trước khi thao tác. */
  private async assertExists(id: string): Promise<AdminUserDetailRecord> {
    const user = await this.adminUsersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(ADMIN_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }
}
