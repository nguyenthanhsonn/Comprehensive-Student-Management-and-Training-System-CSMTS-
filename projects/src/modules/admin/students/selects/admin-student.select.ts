import { Prisma } from '../../../../generated/prisma/client';

/** Select tối giản — student(User) chỉ lấy field cần hiển thị, tuyệt đối không có passwordHash. */
export const adminStudentSelect = {
  id: true,
  studentCode: true,
  enrolledAt: true,
  student: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      isActive: true,
    },
  },
  class: {
    select: {
      id: true,
      name: true,
      enrollmentYear: true,
      major: {
        select: {
          id: true,
          name: true,
          faculty: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.ClassStudentSelect;

export type AdminStudentRecord = Prisma.ClassStudentGetPayload<{
  select: typeof adminStudentSelect;
}>;
