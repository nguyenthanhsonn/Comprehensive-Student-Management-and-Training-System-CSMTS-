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

export const adminClassCatalogDetailSelect = {
  ...adminClassCatalogSelect,
  classCouncilAssignments: {
    select: {
      id: true,
      userId: true,
      assignedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          isActive: true,
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  },
} satisfies Prisma.ClassSelect;

export type AdminClassCatalogDetailRecord = Prisma.ClassGetPayload<{
  select: typeof adminClassCatalogDetailSelect;
}>;
