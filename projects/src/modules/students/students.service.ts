import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UpdateStudentContactDto } from './dto/update-student-contact.dto';
import {
  mapStudentProfile,
  type StudentProfile,
} from './mappers/student.mapper';
import {
  studentEvaluationSelect,
  studentProfileSelect,
  type StudentEvaluationRecord,
  type StudentProfileRecord,
} from './selects/student.select';

type CachedStudentProfile = {
  profile: StudentProfile;
  expiresAt: number;
};

const STUDENT_PROFILE_CACHE_TTL_MS = 30_000;
const STUDENT_PROFILE_CACHE_MAX_SIZE = 1_000;

@Injectable()
export class StudentsService {
  private readonly studentProfileCache = new Map<string, CachedStudentProfile>();

  constructor(private readonly prisma: PrismaService) {}

  async getProfileStudent(userId: string): Promise<StudentProfile> {
    const cachedProfile = this.studentProfileCache.get(userId);
    const now = Date.now();

    if (cachedProfile && cachedProfile.expiresAt > now) {
      return cachedProfile.profile;
    }

    if (cachedProfile) {
      this.studentProfileCache.delete(userId);
    }

    const student = await this.prisma.user.findUnique({
      where: { id: userId },
      select: studentProfileSelect,
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên');
    }

    const profile = mapStudentProfile(student);
    this.cacheStudentProfile(userId, profile, now);

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateStudentContactDto): Promise<StudentProfile> {
    const updateData: Prisma.UserUpdateInput = {
      ...(dto?.email !== undefined ? { email: dto.email } : {}),
      ...(dto?.phone !== undefined ? { phone: dto.phone || null } : {}),
    };

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Chưa cung cấp thông tin cần cập nhật');
    }

    try {
      const student: StudentProfileRecord = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: studentProfileSelect,
      });

      const profile = mapStudentProfile(student);
      this.cacheStudentProfile(userId, profile, Date.now());

      return profile;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email đã tồn tại');
        }

        if (error.code === 'P2025') {
          throw new NotFoundException('Không tìm thấy sinh viên');
        }
      }

      throw error;
    }
  }

  async getMyEvaluations(user: AuthenticatedUser): Promise<StudentEvaluationRecord[]> {
    return this.prisma.evaluationForm.findMany({
      where: { studentId: user.id },
      select: studentEvaluationSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  private cacheStudentProfile(id: string, profile: StudentProfile, now: number): void {
    if (this.studentProfileCache.size >= STUDENT_PROFILE_CACHE_MAX_SIZE) {
      const oldestKey = this.studentProfileCache.keys().next().value;
      if (oldestKey) {
        this.studentProfileCache.delete(oldestKey);
      }
    }

    this.studentProfileCache.set(id, {
      profile,
      expiresAt: now + STUDENT_PROFILE_CACHE_TTL_MS,
    });
  }
}
