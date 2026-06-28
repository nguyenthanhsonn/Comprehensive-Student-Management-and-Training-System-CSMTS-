import { Prisma } from '../../../generated/prisma/client';

export const studentProfileSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  phone: true,
  dateOfBirth: true,
  isActive: true,
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

export const studentEvaluationSelect = {
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

export type StudentProfileRecord = Prisma.UserGetPayload<{
  select: typeof studentProfileSelect;
}>;

export type StudentEvaluationRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof studentEvaluationSelect;
}>;
