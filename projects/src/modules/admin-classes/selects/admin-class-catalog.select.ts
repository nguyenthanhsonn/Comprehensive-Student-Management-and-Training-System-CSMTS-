import { Prisma } from '../../../generated/prisma/client';

export const adminClassCatalogSelect = {
  id: true,
  code: true,
  name: true,
  enrollmentYear: true,
  isActive: true,
  createdAt: true,
  deletedAt: true,
  major: {
    select: {
      id: true,
      code: true,
      name: true,
      faculty: {
        select: { id: true, code: true, name: true },
      },
    },
  },
  _count: {
    select: {
      classStudents: { where: { deletedAt: null } },
      evaluationForms: true,
    },
  },
} satisfies Prisma.ClassSelect;

export type AdminClassCatalogRecord = Prisma.ClassGetPayload<{
  select: typeof adminClassCatalogSelect;
}>;
