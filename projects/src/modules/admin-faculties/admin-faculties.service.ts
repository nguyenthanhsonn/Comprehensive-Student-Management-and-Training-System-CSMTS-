import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResult } from '../../common/shared';
import { Prisma } from '../../generated/prisma/client';
import { AdminFacultiesRepository } from './admin-faculties.repository';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { GetFacultiesQueryDto } from './dto/get-faculties-query.dto';
import { UpdateFacultyStatusDto } from './dto/update-faculty-status.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';
import {
  mapToAdminFacultyResponse,
  normalizeFacultyCode,
} from './mappers/admin-faculty.mapper';
import type { AdminFacultyResponse } from './types/admin-faculty.types';

@Injectable()
export class AdminFacultiesService {
  constructor(private readonly repository: AdminFacultiesRepository) {}

  /** Lấy danh sách khoa có phân trang, tìm kiếm và lọc. Mặc định chỉ lấy khoa chưa xóa mềm. */
  async findAll(
    query: GetFacultiesQueryDto,
  ): Promise<PaginatedResult<AdminFacultyResponse>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.FacultyWhereInput = {
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

    const { items, total } = await this.repository.findMany(
      where,
      skip,
      limit,
    );

    return {
      items: items.map(mapToAdminFacultyResponse),
      page,
      limit,
      total,
    };
  }

  /** Xem chi tiết 1 khoa - cho phép xem cả khoa đã xóa mềm để phục vụ tra cứu/audit. */
  async findOne(id: string): Promise<AdminFacultyResponse> {
    const faculty = await this.repository.findById(id);

    if (!faculty) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    return mapToAdminFacultyResponse(faculty);
  }

  async create(dto: CreateFacultyDto): Promise<AdminFacultyResponse> {
    const code = normalizeFacultyCode(dto.code);
    await this.assertCodeAvailable(code);

    try {
      const faculty = await this.repository.create({
        code,
        name: dto.name.trim(),
      });

      return mapToAdminFacultyResponse(faculty);
    } catch (error) {
      this.handleKnownFacultyError(error);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateFacultyDto,
  ): Promise<AdminFacultyResponse> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Chưa cung cấp thông tin cần cập nhật');
    }

    const current = await this.repository.findActiveById(id);
    if (!current) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    const nextCode =
      dto.code !== undefined ? normalizeFacultyCode(dto.code) : undefined;

    if (nextCode !== undefined && nextCode !== current.code) {
      await this.assertCodeAvailable(nextCode);
    }

    try {
      const faculty = await this.repository.update(id, {
        ...(nextCode !== undefined && { code: nextCode }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });

      return mapToAdminFacultyResponse(faculty);
    } catch (error) {
      this.handleKnownFacultyError(error);
      throw error;
    }
  }

  /** Giữ lại endpoint /status riêng cho tương thích ngược - chỉ đổi isActive, không đổi code/name. */
  async updateStatus(
    id: string,
    dto: UpdateFacultyStatusDto,
  ): Promise<AdminFacultyResponse> {
    const current = await this.repository.findActiveById(id);
    if (!current) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    const faculty = await this.repository.update(id, {
      isActive: dto.isActive,
    });

    return mapToAdminFacultyResponse(faculty);
  }

  /**
   * Xóa mềm khoa bằng cách cập nhật deletedAt + isActive=false.
   * Chặn xóa nếu khoa còn ngành học hoặc phân công hội đồng khoa đang hoạt động,
   * tránh để dữ liệu con "mồ côi" tham chiếu tới 1 khoa đã bị xóa.
   */
  async remove(id: string): Promise<AdminFacultyResponse> {
    const faculty = await this.repository.findActiveById(id);

    if (!faculty) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    if (faculty._count.majors > 0) {
      throw new BadRequestException(
        'Không thể xóa khoa đang có ngành học hoạt động. Vui lòng ẩn hoặc xóa các ngành học trước.',
      );
    }

    if (faculty._count.facultyCouncilAssignments > 0) {
      throw new BadRequestException(
        'Không thể xóa khoa đã có phân công hội đồng khoa. Vui lòng gỡ phân công trước.',
      );
    }

    const removed = await this.repository.softDelete(id);

    return mapToAdminFacultyResponse(removed);
  }

  /**
   * Kiểm tra mã khoa còn dùng được không - phân biệt rõ 2 trường hợp: trùng với khoa
   * đang hoạt động (Conflict thông thường) hay trùng với khoa đã xóa mềm (Conflict kèm
   * gợi ý rõ ràng, không tự động ghi đè/khôi phục bản ghi cũ).
   */
  private async assertCodeAvailable(code: string): Promise<void> {
    const existing = await this.repository.findByCode(code);

    if (!existing) {
      return;
    }

    if (existing.deletedAt) {
      throw new ConflictException(
        'Mã khoa này đã thuộc về một khoa đã bị xóa mềm trước đó. Vui lòng dùng mã khác.',
      );
    }

    throw new ConflictException('Mã khoa đã tồn tại');
  }

  private handleKnownFacultyError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    if (error.code === 'P2002') {
      throw new ConflictException('Mã khoa đã tồn tại');
    }

    if (error.code === 'P2025') {
      throw new NotFoundException('Không tìm thấy khoa');
    }
  }
}
