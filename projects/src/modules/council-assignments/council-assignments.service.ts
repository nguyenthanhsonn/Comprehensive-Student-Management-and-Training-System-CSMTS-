import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from 'src/common/shared';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateClassCouncilAssignmentDto } from './dto/create-class-council-assignment.dto';
import { CreateFacultyCouncilAssignmentDto } from './dto/create-faculty-council-assignment.dto';

@Injectable()
export class CouncilAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gán 1 user (phải có role class_council) phụ trách duyệt điểm cho 1 lớp.
   * Mỗi cặp (user, lớp) chỉ được gán 1 lần (unique constraint).
   */
  async assignClassCouncil(dto: CreateClassCouncilAssignmentDto) {
    await this.assertUserHasRole(dto.userId, UserRole.ClassCouncil, 'class_council');

    const classExists = await this.prisma.class.findUnique({
      where: { id: dto.classId },
      select: { id: true },
    });

    if (!classExists) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    try {
      return await this.prisma.classCouncilAssignment.create({
        data: { userId: dto.userId, classId: dto.classId },
        select: { id: true, userId: true, classId: true, assignedAt: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User này đã được gán phụ trách lớp này');
      }

      throw error;
    }
  }

  /** Gỡ 1 phân công phụ trách lớp. */
  async removeClassCouncil(id: string): Promise<void> {
    try {
      await this.prisma.classCouncilAssignment.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Không tìm thấy phân công này');
      }

      throw error;
    }
  }

  /**
   * Gán 1 user (phải có role faculty_council) phụ trách duyệt điểm cho 1 khoa.
   * Mỗi cặp (user, khoa) chỉ được gán 1 lần (unique constraint).
   */
  async assignFacultyCouncil(dto: CreateFacultyCouncilAssignmentDto) {
    await this.assertUserHasRole(dto.userId, UserRole.FacultyCouncil, 'faculty_council');

    const facultyExists = await this.prisma.faculty.findUnique({
      where: { id: dto.facultyId },
      select: { id: true },
    });

    if (!facultyExists) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    try {
      return await this.prisma.facultyCouncilAssignment.create({
        data: { userId: dto.userId, facultyId: dto.facultyId },
        select: { id: true, userId: true, facultyId: true, assignedAt: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User này đã được gán phụ trách khoa này');
      }

      throw error;
    }
  }

  /** Gỡ 1 phân công phụ trách khoa. */
  async removeFacultyCouncil(id: string): Promise<void> {
    try {
      await this.prisma.facultyCouncilAssignment.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Không tìm thấy phân công này');
      }

      throw error;
    }
  }

  /** Kiểm tra user tồn tại và đúng role được yêu cầu trước khi gán phân công. */
  private async assertUserHasRole(
    userId: string,
    expectedRole: UserRole,
    roleLabel: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.role !== expectedRole) {
      throw new BadRequestException(
        `User phải có vai trò ${roleLabel} mới có thể được gán phân công này`,
      );
    }
  }
}
