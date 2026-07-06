import { Prisma } from '../../../generated/prisma/client';

export const adminMajorSelect = {
  id: true,
  code: true,
  name: true,
  facultyId: true,
  isActive: true,
  createdAt: true,
  faculty: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  _count: {
    select: {
      classes: true,
    },
  },
} satisfies Prisma.MajorSelect;

export type AdminMajorRecord = Prisma.MajorGetPayload<{
  select: typeof adminMajorSelect;
}>;
