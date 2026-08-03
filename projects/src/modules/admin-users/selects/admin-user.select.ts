import { Prisma } from '../../../generated/prisma/client';

// Tuyệt đối không select passwordHash/refreshTokenHash/refreshTokenExpiresAt ở đây.
export const adminUserSelect = {
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
  classLeaderAssignments: {
    select: {
      class: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      assignedAt: true,
    },
    orderBy: { assignedAt: 'desc' },
  },
  advisorAssignments: {
    select: {
      class: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      assignedAt: true,
    },
    orderBy: { assignedAt: 'desc' },
  },
  facultyAssignment: {
    select: {
      faculty: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      assignedAt: true,
    },
  },
} satisfies Prisma.UserSelect;

export type AdminUserRecord = Prisma.UserGetPayload<{
  select: typeof adminUserSelect;
}>;
