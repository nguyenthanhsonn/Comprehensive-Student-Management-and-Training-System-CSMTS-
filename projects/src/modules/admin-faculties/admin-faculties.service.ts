import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResult } from '../../common/shared';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { GetFacultiesQueryDto } from './dto/get-faculties-query.dto';
import { UpdateFacultyStatusDto } from './dto/update-faculty-status.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';
import {
  adminFacultySelect,
  type AdminFacultyRecord,
} from './selects/admin-faculty.select';
import type { AdminFacultyResponse } from './types/admin-faculty.types';

@Injectable()
export class AdminFacultiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: GetFacultiesQueryDto,
  ): Promise<PaginatedResult<AdminFacultyResponse>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where: Prisma.FacultyWhereInput = {
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

    const [faculties, total] = await Promise.all([
      this.prisma.faculty.findMany({
        where,
        select: adminFacultySelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.faculty.count({ where }),
    ]);

    return {
      items: faculties.map(mapToAdminFacultyResponse),
      page,
      limit,
      total,
    };
  }

  async findOne(id: string): Promise<AdminFacultyResponse> {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id },
      select: adminFacultySelect,
    });

    if (!faculty) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    return mapToAdminFacultyResponse(faculty);
  }

  async create(dto: CreateFacultyDto): Promise<AdminFacultyResponse> {
    try {
      const faculty = await this.prisma.faculty.create({
        data: {
          code: normalizeFacultyCode(dto.code),
          name: dto.name.trim(),
        },
        select: adminFacultySelect,
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

    try {
      const faculty = await this.prisma.faculty.update({
        where: { id },
        data: {
          ...(dto.code !== undefined
            ? { code: normalizeFacultyCode(dto.code) }
            : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        },
        select: adminFacultySelect,
      });

      return mapToAdminFacultyResponse(faculty);
    } catch (error) {
      this.handleKnownFacultyError(error);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    dto: UpdateFacultyStatusDto,
  ): Promise<AdminFacultyResponse> {
    try {
      const faculty = await this.prisma.faculty.update({
        where: { id },
        data: { isActive: dto.isActive },
        select: adminFacultySelect,
      });

      return mapToAdminFacultyResponse(faculty);
    } catch (error) {
      this.handleKnownFacultyError(error);
      throw error;
    }
  }

  async remove(id: string): Promise<AdminFacultyResponse> {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id },
      select: adminFacultySelect,
    });

    if (!faculty) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    if (faculty._count.majors > 0) {
      throw new BadRequestException(
        'Không thể xóa khoa đã có ngành học. Vui lòng ẩn khoa thay vì xóa.',
      );
    }

    if (faculty._count.facultyCouncilAssignments > 0) {
      throw new BadRequestException(
        'Không thể xóa khoa đã có phân công hội đồng khoa. Vui lòng gỡ phân công trước hoặc ẩn khoa.',
      );
    }

    await this.prisma.faculty.delete({
      where: { id },
      select: { id: true },
    });

    return mapToAdminFacultyResponse(faculty);
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

function mapToAdminFacultyResponse(
  record: AdminFacultyRecord,
): AdminFacultyResponse {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    isActive: record.isActive,
    createdAt: record.createdAt,
    majorCount: record._count.majors,
    assignmentCount: record._count.facultyCouncilAssignments,
  };
}

function normalizeFacultyCode(code: string): string {
  return code.trim().toUpperCase();
}
