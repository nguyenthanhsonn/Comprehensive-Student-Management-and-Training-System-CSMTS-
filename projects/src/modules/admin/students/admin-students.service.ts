import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ADMIN_MESSAGES } from '../../../common/constants/message.constant';
import {
  buildPaginatedResult,
  calculateSkip,
} from '../../../common/helpers/pagination.helper';
import type { PaginatedResult } from '../../../common/types/pagination-result.type';
import { UserRole } from '../../../generated/prisma/client';
import {
  AdminStudentsRepository,
  type AdminStudentFilter,
} from './admin-students.repository';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { mapToAdminStudentItem } from './helpers/admin-student.mapper';
import type { AdminStudentRecord } from './selects/admin-student.select';
import type { AdminStudentItem } from './types/admin-student.types';

@Injectable()
export class AdminStudentsService {
  constructor(private readonly adminStudentsRepository: AdminStudentsRepository) {}

  /**
   * Lấy danh sách hồ sơ sinh viên với phân trang, tìm kiếm và lọc theo lớp/khoa/ngành.
   * Chỉ trả về các trường cần thiết để tránh lộ dữ liệu nhạy cảm của User liên kết.
   */
  async findMany(
    query: QueryStudentDto,
  ): Promise<PaginatedResult<AdminStudentItem>> {
    const skip = calculateSkip(query.page, query.limit);
    const filter: AdminStudentFilter = {
      keyword: query.keyword,
      classId: query.classId,
      facultyId: query.facultyId,
      majorId: query.majorId,
    };

    const { items, total } = await this.adminStudentsRepository.findMany(
      filter,
      skip,
      query.limit,
    );

    return buildPaginatedResult(
      items.map(mapToAdminStudentItem),
      total,
      query.page,
      query.limit,
    );
  }

  /** Xem chi tiết 1 hồ sơ sinh viên. */
  async findById(id: string): Promise<AdminStudentItem> {
    const student = await this.assertExists(id);
    return mapToAdminStudentItem(student);
  }

  /**
   * Tạo hồ sơ sinh viên mới cho 1 tài khoản đã có sẵn.
   * Validate: user tồn tại + đúng vai trò student, user chưa có hồ sơ đang hoạt động,
   * mã sinh viên chưa trùng, lớp học tồn tại.
   */
  async create(dto: CreateStudentDto): Promise<AdminStudentItem> {
    const user = await this.adminStudentsRepository.findUserById(dto.userId);
    if (!user) {
      throw new NotFoundException(ADMIN_MESSAGES.USER_NOT_FOUND);
    }

    if (user.role !== UserRole.student) {
      throw new BadRequestException(ADMIN_MESSAGES.USER_MUST_BE_STUDENT_ROLE);
    }

    const existingProfile = await this.adminStudentsRepository.findActiveByUserId(
      dto.userId,
    );
    if (existingProfile) {
      throw new ConflictException(
        ADMIN_MESSAGES.USER_ALREADY_HAS_STUDENT_PROFILE,
      );
    }

    const existingCode = await this.adminStudentsRepository.findByStudentCode(
      dto.studentCode,
    );
    if (existingCode) {
      throw new ConflictException(ADMIN_MESSAGES.STUDENT_CODE_EXISTS);
    }

    const classExists = await this.adminStudentsRepository.findClassById(
      dto.classId,
    );
    if (!classExists) {
      throw new NotFoundException(ADMIN_MESSAGES.CLASS_NOT_FOUND);
    }

    const student = await this.adminStudentsRepository.create({
      userId: dto.userId,
      studentCode: dto.studentCode,
      classId: dto.classId,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    });

    return mapToAdminStudentItem(student);
  }

  /**
   * Cập nhật hồ sơ sinh viên. Không cho đổi userId (giữ nguyên chủ sở hữu hồ sơ).
   * Validate classId (nếu có) tồn tại, studentCode (nếu có) không trùng với hồ sơ khác.
   */
  async update(id: string, dto: UpdateStudentDto): Promise<AdminStudentItem> {
    const current = await this.assertExists(id);

    if (dto.studentCode !== undefined && dto.studentCode !== current.studentCode) {
      const existingCode = await this.adminStudentsRepository.findByStudentCode(
        dto.studentCode,
      );
      if (existingCode) {
        throw new ConflictException(ADMIN_MESSAGES.STUDENT_CODE_EXISTS);
      }
    }

    if (dto.classId !== undefined) {
      const classExists = await this.adminStudentsRepository.findClassById(
        dto.classId,
      );
      if (!classExists) {
        throw new NotFoundException(ADMIN_MESSAGES.CLASS_NOT_FOUND);
      }
    }

    const student = await this.adminStudentsRepository.update(
      id,
      current.student.id,
      {
        studentCode: dto.studentCode,
        classId: dto.classId,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    );

    return mapToAdminStudentItem(student);
  }

  /**
   * Xóa mềm hồ sơ sinh viên bằng cách cập nhật deletedAt.
   * Không xóa User kèm theo — chỉ xóa hồ sơ sinh viên (bản ghi ClassStudent).
   */
  async softDelete(id: string): Promise<void> {
    await this.assertExists(id);
    await this.adminStudentsRepository.softDelete(id);
  }

  /** Đảm bảo hồ sơ sinh viên tồn tại (và chưa bị xóa mềm) trước khi thao tác. */
  private async assertExists(id: string): Promise<AdminStudentRecord> {
    const student = await this.adminStudentsRepository.findById(id);

    if (!student) {
      throw new NotFoundException(ADMIN_MESSAGES.STUDENT_NOT_FOUND);
    }

    return student;
  }
}
