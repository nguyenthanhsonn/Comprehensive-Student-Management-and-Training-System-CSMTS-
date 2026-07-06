import { Prisma } from '../../../generated/prisma/client';

export const adminFacultySelect = {
  id: true,
  code: true,
  name: true,
  isActive: true,
  createdAt: true,
  _count: {
    select: {
      majors: true,
      facultyCouncilAssignments: true,
    },
  },
} satisfies Prisma.FacultySelect;

export type AdminFacultyRecord = Prisma.FacultyGetPayload<{
  select: typeof adminFacultySelect;
}>;
