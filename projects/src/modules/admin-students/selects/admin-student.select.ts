import { Prisma } from '../../../generated/prisma/client';

// Tuyệt đối không select passwordHash/refreshTokenHash/refreshTokenExpiresAt ở đây.
export const adminStudentSelect = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  phone: true,
  dateOfBirth: true,
  role: true,
  isActive: true,
  lockedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  classStudents: {
    orderBy: { enrolledAt: 'desc' },
    take: 1,
    select: {
      id: true,
      studentCode: true,
      enrolledAt: true,
      deletedAt: true,
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
              faculty: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type AdminStudentRecord = Prisma.UserGetPayload<{
  select: typeof adminStudentSelect;
}>;
