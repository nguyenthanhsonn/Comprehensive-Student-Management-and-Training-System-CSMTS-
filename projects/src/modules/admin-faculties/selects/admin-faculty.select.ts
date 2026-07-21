import { Prisma } from '../../../generated/prisma/client';

export const adminFacultySelect = {
  id: true,
  code: true,
  name: true,
  isActive: true,
  createdAt: true,
  deletedAt: true,
  _count: {
    select: {
      majors: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.FacultySelect;

export type AdminFacultyRecord = Prisma.FacultyGetPayload<{
  select: typeof adminFacultySelect;
}>;
