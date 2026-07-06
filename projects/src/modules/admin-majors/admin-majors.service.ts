import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/shared';
import { CreateMajorDto } from './dto/create-major.dto';
import { GetMajorsQueryDto } from './dto/get-majors-query.dto';
import { UpdateMajorStatusDto } from './dto/update-major-status.dto';
import { UpdateMajorDto } from './dto/update-major.dto';
import {
  adminMajorSelect,
  type AdminMajorRecord,
} from './selects/admin-major.select';
import type { AdminMajorResponse } from './types/admin-major.types';

@Injectable()
export class AdminMajorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll( query: GetMajorsQueryDto): Promise<PaginatedResult<AdminMajorResponse>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where: Prisma.MajorWhereInput = {
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

    const [majors, total] = await Promise.all([
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
      items: majors.map(mapToAdminMajorResponse),
      page,
      limit,
      total,
    };
  }

  async findOne(id: string): Promise<AdminMajorResponse> {
    const major = await this.prisma.major.findUnique({
      where: { id },
      select: adminMajorSelect,
    });

    if (!major) {
      throw new NotFoundException('Không tìm thấy ngành học');
    }

    return mapToAdminMajorResponse(major);
  }

  async create(dto: CreateMajorDto): Promise<AdminMajorResponse> {
    await this.assertFacultyExists(dto.facultyId);

    try {
      const major = await this.prisma.major.create({
        data: {
          code: normalizeMajorCode(dto.code),
          name: dto.name.trim(),
          facultyId: dto.facultyId,
        },
        select: adminMajorSelect,
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

    if (dto.facultyId) {
      await this.assertFacultyExists(dto.facultyId);
    }

    try {
      const major = await this.prisma.major.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: normalizeMajorCode(dto.code) } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.facultyId !== undefined ? { facultyId: dto.facultyId } : {}),
        },
        select: adminMajorSelect,
      });

      return mapToAdminMajorResponse(major);
    } catch (error) {
      this.handleKnownMajorError(error);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    dto: UpdateMajorStatusDto,
  ): Promise<AdminMajorResponse> {
    try {
      const major = await this.prisma.major.update({
        where: { id },
        data: { isActive: dto.isActive },
        select: adminMajorSelect,
      });

      return mapToAdminMajorResponse(major);
    } catch (error) {
      this.handleKnownMajorError(error);
      throw error;
    }
  }

  async remove(id: string): Promise<AdminMajorResponse> {
    const major = await this.prisma.major.findUnique({
      where: { id },
      select: adminMajorSelect,
    });

    if (!major) {
      throw new NotFoundException('Không tìm thấy ngành học');
    }

    if (major._count.classes > 0) {
      throw new BadRequestException(
        'Không thể xóa ngành học đã có lớp. Vui lòng ẩn ngành học thay vì xóa.',
      );
    }

    await this.prisma.major.delete({
      where: { id },
      select: { id: true },
    });

    return mapToAdminMajorResponse(major);
  }

  private async assertFacultyExists(facultyId: string): Promise<void> {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id: facultyId },
      select: { id: true },
    });

    if (!faculty) {
      throw new NotFoundException('Không tìm thấy khoa');
    }
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

function mapToAdminMajorResponse(record: AdminMajorRecord): AdminMajorResponse {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    facultyId: record.facultyId,
    isActive: record.isActive,
    createdAt: record.createdAt,
    faculty: record.faculty,
    classCount: record._count.classes,
  };
}

function normalizeMajorCode(code: string): string {
  return code.trim().toUpperCase();
}
