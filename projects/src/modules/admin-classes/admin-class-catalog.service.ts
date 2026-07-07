import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResult } from '../../common/shared';
import { Prisma } from '../../generated/prisma/client';
import { AdminClassCatalogRepository } from './admin-class-catalog.repository';
import { CreateClassDto } from './dto/create-class.dto';
import { GetClassesQueryDto } from './dto/get-classes-query.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import {
  mapToAdminClassResponse,
  normalizeClassCode,
} from './mappers/admin-class-catalog.mapper';
import type { AdminClassResponse } from './types/admin-class-catalog.types';

/**
 * Service quản lý danh mục lớp (CRUD) cho Task 4.2 - tách biệt hoàn toàn với
 * AdminClassesService (quản lý sinh viên trong lớp/import Excel).
 */
@Injectable()
export class AdminClassCatalogService {
  constructor(private readonly repository: AdminClassCatalogRepository) {}

  /** Lấy danh sách lớp có phân trang, tìm kiếm và lọc theo ngành/khoa. Mặc định chỉ lấy lớp chưa xóa mềm. */
  async findAll(
    query: GetClassesQueryDto,
  ): Promise<PaginatedResult<AdminClassResponse>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.ClassWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.majorId ? { majorId: query.majorId } : {}),
      ...(query.facultyId ? { major: { facultyId: query.facultyId } } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { major: { name: { contains: search, mode: 'insensitive' } } },
              {
                major: {
                  faculty: { name: { contains: search, mode: 'insensitive' } },
                },
              },
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
      items: items.map(mapToAdminClassResponse),
      page,
      limit,
      total,
    };
  }

  /** Xem chi tiết 1 lớp - cho phép xem cả lớp đã xóa mềm để phục vụ tra cứu/audit. */
  async findOne(id: string): Promise<AdminClassResponse> {
    const classRecord = await this.repository.findById(id);

    if (!classRecord) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    return mapToAdminClassResponse(classRecord);
  }

  async create(dto: CreateClassDto): Promise<AdminClassResponse> {
    await this.assertMajorExists(dto.majorId);
    const code = normalizeClassCode(dto.code);
    await this.assertCodeAvailable(code);

    try {
      const classRecord = await this.repository.create({
        code,
        name: dto.name.trim(),
        majorId: dto.majorId,
        enrollmentYear: dto.enrollmentYear,
      });

      return mapToAdminClassResponse(classRecord);
    } catch (error) {
      this.handleKnownClassError(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateClassDto): Promise<AdminClassResponse> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Chưa cung cấp thông tin cần cập nhật');
    }

    const current = await this.repository.findActiveById(id);
    if (!current) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    if (dto.majorId !== undefined) {
      await this.assertMajorExists(dto.majorId);
    }

    const nextCode =
      dto.code !== undefined ? normalizeClassCode(dto.code) : undefined;

    if (nextCode !== undefined && nextCode !== current.code) {
      await this.assertCodeAvailable(nextCode);
    }

    try {
      const classRecord = await this.repository.update(id, {
        ...(nextCode !== undefined && { code: nextCode }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.majorId !== undefined && { majorId: dto.majorId }),
        ...(dto.enrollmentYear !== undefined && {
          enrollmentYear: dto.enrollmentYear,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });

      return mapToAdminClassResponse(classRecord);
    } catch (error) {
      this.handleKnownClassError(error);
      throw error;
    }
  }

  /**
   * Xóa mềm lớp bằng cách cập nhật deletedAt + isActive=false.
   * Chặn xóa nếu lớp còn sinh viên đang theo học hoặc đã phát sinh phiếu đánh giá,
   * tránh mất dấu vết dữ liệu đã gắn với lớp.
   */
  async remove(id: string): Promise<AdminClassResponse> {
    const classRecord = await this.repository.findActiveById(id);

    if (!classRecord) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    if (classRecord._count.classStudents > 0) {
      throw new BadRequestException(
        'Không thể xóa lớp đang có sinh viên theo học. Vui lòng chuyển lớp hoặc xóa hồ sơ sinh viên trước.',
      );
    }

    if (classRecord._count.evaluationForms > 0) {
      throw new BadRequestException(
        'Không thể xóa lớp đã phát sinh phiếu đánh giá rèn luyện.',
      );
    }

    const removed = await this.repository.softDelete(id);

    return mapToAdminClassResponse(removed);
  }

  /** Kiểm tra ngành tồn tại và chưa xóa mềm trước khi gán cho lớp. */
  private async assertMajorExists(majorId: string): Promise<void> {
    const major = await this.repository.findActiveMajorById(majorId);

    if (!major) {
      throw new NotFoundException('Không tìm thấy ngành học');
    }
  }

  /**
   * Kiểm tra mã lớp còn dùng được không - phân biệt trùng với lớp đang hoạt động
   * hay trùng với lớp đã xóa mềm (không tự động ghi đè/khôi phục bản ghi cũ).
   */
  private async assertCodeAvailable(code: string): Promise<void> {
    const existing = await this.repository.findByCode(code);

    if (!existing) {
      return;
    }

    if (existing.deletedAt) {
      throw new ConflictException(
        'Mã lớp này đã thuộc về một lớp đã bị xóa mềm trước đó. Vui lòng dùng mã khác.',
      );
    }

    throw new ConflictException('Mã lớp đã tồn tại');
  }

  private handleKnownClassError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    if (error.code === 'P2002') {
      throw new ConflictException('Mã lớp đã tồn tại');
    }

    if (error.code === 'P2025') {
      throw new NotFoundException('Không tìm thấy lớp học');
    }
  }
}
