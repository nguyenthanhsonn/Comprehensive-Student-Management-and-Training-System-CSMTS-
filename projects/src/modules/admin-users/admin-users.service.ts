import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { UserRole, type PaginatedResult } from '../../common/shared';
import { buildAccountActiveStateData } from '../../common/helpers/account-active-state.helper';
import {
  formatDateOnly,
  parseOptionalDateOnly,
} from '../../common/helpers/date-only.helper';
import { AuthTokenStoreService } from '../auth/jwt/auth-token-store';
import { PASSWORD_SALT_ROUNDS } from '../auth/constants/password.constants';
import { StudentAccountMailService } from '../mail/student-account-mail.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { GetAdminUsersQueryDto } from './dto/get-admin-users-query.dto';
import { LockAdminUserDto } from './dto/lock-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import {
  adminUserSelect,
  type AdminUserRecord,
} from './selects/admin-user.select';
import type { AdminUserResponse } from './types/admin-user.types';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenStore: AuthTokenStoreService,
    private readonly accountMailService: StudentAccountMailService,
  ) {}

  /**
   * Lấy danh sách tài khoản có phân trang, tìm kiếm theo username/email/họ tên/số điện thoại
   * và lọc theo vai trò/trạng thái hoạt động. Mặc định chỉ lấy tài khoản chưa xóa mềm.
   */
  async findAll(
    query: GetAdminUsersQueryDto,
  ): Promise<PaginatedResult<AdminUserResponse>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const keyword = query.keyword?.trim();

    const where: Prisma.UserWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(keyword
        ? {
            OR: [
              { username: { contains: keyword, mode: 'insensitive' } },
              { email: { contains: keyword, mode: 'insensitive' } },
              { fullName: { contains: keyword, mode: 'insensitive' } },
              { phone: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map(mapToAdminUserResponse),
      page,
      limit,
      total,
    };
  }

  /** Xem chi tiết 1 tài khoản theo id - cho phép xem cả tài khoản đã xóa mềm để phục vụ tra cứu/audit. */
  async findOne(id: string): Promise<AdminUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: adminUserSelect,
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    return mapToAdminUserResponse(user);
  }

  /** Tạo tài khoản mới - mật khẩu được hash bằng bcrypt trước khi lưu vào CSDL. */
  async create(dto: CreateAdminUserDto): Promise<AdminUserResponse> {
    this.assertNotStudentRole(
      dto.role,
      'Vui lòng dùng API /admin/students để tạo sinh viên',
    );

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          username: dto.username,
          email: normalizeEmail(dto.email),
          fullName: dto.fullName.trim(),
          passwordHash,
          role: dto.role,
          phone: dto.phone,
          dateOfBirth: parseOptionalDateOnly(dto.dateOfBirth),
        },
        select: adminUserSelect,
      });

      const response = mapToAdminUserResponse(user);
      const mailResult = await this.sendCreatedManagedUserEmail(dto);

      return {
        ...response,
        accountEmailSent: mailResult.sent,
        accountEmailError: mailResult.error,
      };
    } catch (error) {
      this.handleKnownUserError(error);
      throw error;
    }
  }

  /**
   * Cập nhật thông tin tài khoản (fullName, email, phone, dateOfBirth, role, isActive).
   * Nếu isActive chuyển về false, đồng bộ lockedAt, xóa refresh token và thu hồi phiên
   * đăng nhập hiện tại ngay lập tức - giống hệt hành động khóa tài khoản.
   */
  async update(
    id: string,
    dto: UpdateAdminUserDto,
    currentUserId: string,
  ): Promise<AdminUserResponse> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Chưa cung cấp thông tin cần cập nhật');
    }

    await this.assertActiveExists(id);

    if (dto.role !== undefined) {
      this.assertNotStudentRole(
        dto.role,
        'Không thể đổi vai trò thành sinh viên qua API này. Vui lòng dùng /admin/students',
      );
    }

    if (dto.isActive === false) {
      this.assertNotSelf(id, currentUserId, 'khóa');
    }

    const activeStateData =
      dto.isActive !== undefined
        ? buildAccountActiveStateData(dto.isActive)
        : {};

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined && { fullName: dto.fullName.trim() }),
          ...(dto.username !== undefined && { username: dto.username }),
          ...(dto.email !== undefined && { email: normalizeEmail(dto.email) }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.dateOfBirth !== undefined && {
            dateOfBirth: parseOptionalDateOnly(dto.dateOfBirth),
          }),
          ...(dto.role !== undefined && { role: dto.role }),
          ...activeStateData,
        },
        select: adminUserSelect,
      });

      if (dto.isActive === false) {
        this.tokenStore.revokeUserTokensIssuedBefore(id);
      }

      return mapToAdminUserResponse(user);
    } catch (error) {
      this.handleKnownUserError(error);
      throw error;
    }
  }

  /**
   * Khóa/mở khóa tài khoản người dùng.
   * Khóa: set isActive=false, lockedAt=hiện tại, xóa refresh token và thu hồi ngay phiên
   * đăng nhập đang hoạt động (kể cả access token chưa hết hạn). Mở khóa: set isActive=true,
   * lockedAt=null.
   */
  async lock(
    id: string,
    dto: LockAdminUserDto,
    currentUserId: string,
  ): Promise<AdminUserResponse> {
    await this.assertActiveExists(id);

    if (dto.locked) {
      this.assertNotSelf(id, currentUserId, 'khóa');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: buildAccountActiveStateData(!dto.locked),
      select: adminUserSelect,
    });

    if (dto.locked) {
      this.tokenStore.revokeUserTokensIssuedBefore(id);
    }

    return mapToAdminUserResponse(user);
  }

  /** Xóa cứng tài khoản khỏi CSDL và thu hồi phiên đăng nhập đang hoạt động. */
  async remove(id: string, currentUserId: string): Promise<AdminUserResponse> {
    await this.assertActiveExists(id);
    this.assertNotSelf(id, currentUserId, 'xóa');

    try {
      const user = await this.prisma.user.delete({
        where: { id },
        select: adminUserSelect,
      });

      this.tokenStore.revokeUserTokensIssuedBefore(id);

      return mapToAdminUserResponse(user);
    } catch (error) {
      this.handleKnownUserError(error);
      throw error;
    }
  }

  /** Đảm bảo tài khoản tồn tại và chưa bị xóa mềm trước khi cho phép chỉnh sửa/khóa/xóa. */
  private async assertActiveExists(id: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }
  }

  /** Chặn admin tự khóa hoặc tự xóa chính tài khoản đang đăng nhập. */
  private assertNotSelf(
    targetId: string,
    currentUserId: string,
    action: string,
  ): void {
    if (targetId === currentUserId) {
      throw new ForbiddenException(`Bạn không thể tự ${action} chính mình`);
    }
  }

  private assertNotStudentRole(role: UserRole, message: string): void {
    if (role === UserRole.Student) {
      throw new BadRequestException(message);
    }
  }

  private async sendCreatedManagedUserEmail(
    dto: CreateAdminUserDto,
  ): Promise<{ sent: boolean; error: string | null }> {
    if (dto.role !== UserRole.ClassCouncil) {
      return { sent: false, error: null };
    }

    if (!this.accountMailService.isConfigured()) {
      return {
        sent: false,
        error:
          'Chưa thiết lập chức năng gửi email nên tài khoản chưa được gửi đi',
      };
    }

    try {
      await this.accountMailService.sendStaffAccount({
        email: normalizeEmail(dto.email),
        fullName: dto.fullName.trim(),
        username: dto.username,
        password: dto.password,
        roleLabel: 'Lớp/CVHT',
      });

      return { sent: true, error: null };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Gửi email tài khoản thất bại';
      this.logger.error(
        `Gửi email tài khoản class_council thất bại: ${message}`,
      );

      return {
        sent: false,
        error: 'Chưa gửi được email tài khoản, vui lòng kiểm tra lại sau',
      };
    }
  }

  private handleKnownUserError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    if (error.code === 'P2002') {
      const target =
        (error.meta?.target as string[] | undefined)?.join(',') ?? '';

      if (target.includes('username')) {
        throw new ConflictException('Tên đăng nhập đã tồn tại');
      }

      throw new ConflictException('Email đã tồn tại');
    }

    if (error.code === 'P2025') {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    if (error.code === 'P2003') {
      throw new ConflictException(
        'Không thể xóa tài khoản này vì vẫn còn dữ liệu liên quan',
      );
    }
  }
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function mapToAdminUserResponse(user: AdminUserRecord): AdminUserResponse {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    dateOfBirth: formatDateOnly(user.dateOfBirth),
    role: user.role as UserRole,
    isActive: user.isActive,
    lockedAt: user.lockedAt,
    deletedAt: user.deletedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    managedClasses: user.classCouncilAssignments.map((assignment) => ({
      id: assignment.class.id,
      code: assignment.class.code,
      name: assignment.class.name,
      assignedAt: assignment.assignedAt,
    })),
  };
}
