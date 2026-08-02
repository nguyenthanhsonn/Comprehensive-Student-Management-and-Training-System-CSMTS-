import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, type PaginatedResult } from '../../common/shared';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GetClassesQueryDto } from '../admin-classes/dto/get-classes-query.dto';
import { mapToAdminClassResponse } from '../admin-classes/mappers/admin-class-catalog.mapper';
import { adminClassCatalogSelect } from '../admin-classes/selects/admin-class-catalog.select';
import type { AdminClassResponse } from '../admin-classes/types/admin-class-catalog.types';
import { AdminMajorsRepository } from './admin-majors.repository';
import { CreateMajorDto } from './dto/create-major.dto';
import { GetMajorsQueryDto } from './dto/get-majors-query.dto';
import { UpdateMajorStatusDto } from './dto/update-major-status.dto';
import { UpdateMajorDto } from './dto/update-major.dto';
import {
  mapToAdminMajorResponse,
  normalizeMajorCode,
} from './mappers/admin-major.mapper';
import { adminMajorSelect } from './selects/admin-major.select';
import type { AdminMajorResponse } from './types/admin-major.types';

@Injectable()
export class AdminMajorsService {
  constructor(
    private readonly repository: AdminMajorsRepository,
    private readonly prisma: PrismaService,
  ) {}

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

    const { items, total } = await this.repository.findMany(where, skip, limit);

    return {
      items: items.map(mapToAdminMajorResponse),
      page,
      limit,
      total,
    };
  }

  /** Lấy danh sách lớp thuộc một ngành, dùng cho UI chọn Ngành -> Lớp. */
  async findClasses(
    majorId: string,
    query: GetClassesQueryDto,
  ): Promise<PaginatedResult<AdminClassResponse>> {
    const major = await this.repository.findActiveById(majorId);
    if (!major) {
      throw new NotFoundException('Không tìm thấy ngành học');
    }

    return this.findClassesByMajorId(majorId, query);
  }

  /**
   * Endpoint /majors/:id/classes dùng chung cho admin và khoa.
   * Admin xem mọi ngành, role khoa chỉ xem ngành thuộc khoa được gán.
   */
  async findClassesForViewer(
    userId: string,
    role: UserRole,
    majorId: string,
    query: GetClassesQueryDto,
  ): Promise<PaginatedResult<AdminClassResponse>> {
    if (role === UserRole.Admin) {
      return this.findClasses(majorId, query);
    }

    if (role === UserRole.Faculty) {
      return this.findClassesForFacultyUser(userId, majorId, query);
    }

    throw new ForbiddenException('Không có quyền xem danh sách lớp của ngành này');
  }

  /** Role khoa: lấy danh sách ngành thuộc khoa được gán cho tài khoản đang đăng nhập. */
  async findMajorsForFacultyUser(
    userId: string,
    query: GetMajorsQueryDto,
  ): Promise<PaginatedResult<AdminMajorResponse>> {
    const faculty = await this.findAssignedFaculty(userId);
    return this.findMajorsByFacultyId(faculty.id, query);
  }

  /** Role khoa: lấy danh sách lớp thuộc một ngành trong khoa được gán. */
  async findClassesForFacultyUser(
    userId: string,
    majorId: string,
    query: GetClassesQueryDto,
  ): Promise<PaginatedResult<AdminClassResponse>> {
    const faculty = await this.findAssignedFaculty(userId);
    const major = await this.repository.findActiveById(majorId);

    if (!major) {
      throw new NotFoundException('Không tìm thấy ngành học');
    }

    if (major.facultyId !== faculty.id) {
      throw new ForbiddenException('Bạn không được quản lý ngành này');
    }

    return this.findClassesByMajorId(majorId, query, faculty.id);
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
  private async findAssignedFaculty(
    userId: string,
  ): Promise<{ id: string; code: string; name: string }> {
    const assignment = await this.prisma.facultyAssignment.findUnique({
      where: { userId },
      select: {
        faculty: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !assignment ||
      assignment.faculty.deletedAt ||
      !assignment.faculty.isActive
    ) {
      throw new ForbiddenException('Tài khoản khoa chưa được gán khoa quản lý');
    }

    return {
      id: assignment.faculty.id,
      code: assignment.faculty.code,
      name: assignment.faculty.name,
    };
  }

  private async findMajorsByFacultyId(
    facultyId: string,
    query: GetMajorsQueryDto,
  ): Promise<PaginatedResult<AdminMajorResponse>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.MajorWhereInput = {
      facultyId,
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

    const [items, total] = await Promise.all([
      this.prisma.major.findMany({
        where,
        select: adminMajorSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.major.count({ where }),
    ]);

    return {
      items: items.map(mapToAdminMajorResponse),
      page,
      limit,
      total,
    };
  }

  private async findClassesByMajorId(
    majorId: string,
    query: GetClassesQueryDto,
    requiredFacultyId?: string,
  ): Promise<PaginatedResult<AdminClassResponse>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where: Prisma.ClassWhereInput = {
      majorId,
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(requiredFacultyId
        ? { major: { facultyId: requiredFacultyId } }
        : query.facultyId
          ? { major: { facultyId: query.facultyId } }
          : {}),
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

    const [items, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        select: adminClassCatalogSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.class.count({ where }),
    ]);

    return {
      items: items.map(mapToAdminClassResponse),
      page,
      limit,
      total,
    };
  }

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
