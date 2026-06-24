import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UpdateStudentContactDto } from './dto/update-student-contact.dto';

const studentProfileSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  phone: true,
  dateOfBirth: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  classStudents: {
    orderBy: { enrolledAt: 'desc' },
    take: 1,
    select: {
      studentCode: true,
      enrolledAt: true,
      class: {
        select: {
          id: true,
          code: true,
          name: true,
          enrollmentYear: true,
          major: {
            select: {
              id: true,
              code: true,
              name: true,
              faculty: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

const studentEvaluationSelect = {
  id: true,
  status: true,
  studentScore: true,
  classScore: true,
  finalScore: true,
  rank: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
  class: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  semester: {
    select: {
      id: true,
      year: true,
      semester: true,
      startDate: true,
      endDate: true,
      studentDeadline: true,
      classDeadline: true,
      facultyDeadline: true,
      isActive: true,
    },
  },
} satisfies Prisma.EvaluationFormSelect;

type StudentProfileRecord = Prisma.UserGetPayload<{
  select: typeof studentProfileSelect;
}>;

type StudentEvaluationRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof studentEvaluationSelect;
}>;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(user: AuthenticatedUser) {
    const student = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: studentProfileSelect,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.toStudentProfile(student);
  }

  async updateMyContact(user: AuthenticatedUser, dto: UpdateStudentContactDto) {
    if (!Object.prototype.hasOwnProperty.call(dto, 'phone')) {
      throw new BadRequestException('No contact information provided');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        phone: dto.phone ?? null,
      },
      select: { id: true },
    });

    return this.getMe(user);
  }

  async getMyEvaluations(
    user: AuthenticatedUser,
  ): Promise<StudentEvaluationRecord[]> {
    return this.prisma.evaluationForm.findMany({
      where: { studentId: user.id },
      select: studentEvaluationSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  private toStudentProfile(student: StudentProfileRecord) {
    const currentEnrollment = student.classStudents[0] ?? null;
    const currentClass = currentEnrollment?.class ?? null;
    const currentMajor = currentClass?.major ?? null;
    const currentFaculty = currentMajor?.faculty ?? null;

    return {
      id: student.id,
      email: student.email,
      fullName: student.fullName,
      role: student.role,
      phone: student.phone,
      dateOfBirth: student.dateOfBirth,
      isActive: student.isActive,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      studentCode: currentEnrollment?.studentCode ?? null,
      enrolledAt: currentEnrollment?.enrolledAt ?? null,
      class: currentClass
        ? {
            id: currentClass.id,
            code: currentClass.code,
            name: currentClass.name,
            enrollmentYear: currentClass.enrollmentYear,
          }
        : null,
      major: currentMajor
        ? {
            id: currentMajor.id,
            code: currentMajor.code,
            name: currentMajor.name,
          }
        : null,
      faculty: currentFaculty
        ? {
            id: currentFaculty.id,
            code: currentFaculty.code,
            name: currentFaculty.name,
          }
        : null,
    };
  }
}
