import { Prisma } from '../../../generated/prisma/client';

export const adminClassStudentSelect = {
  id: true,
  classId: true,
  studentId: true,
  studentCode: true,
  enrolledAt: true,
  student: {
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      dateOfBirth: true,
      isActive: true,
    },
  },
} satisfies Prisma.ClassStudentSelect;

export type AdminClassStudentRecord = Prisma.ClassStudentGetPayload<{
  select: typeof adminClassStudentSelect;
}>;
