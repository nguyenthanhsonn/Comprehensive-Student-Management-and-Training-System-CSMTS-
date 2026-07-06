import { Prisma } from '../../../../generated/prisma/client';

// ─── Chỉ select field cần thiết — không bao giờ lấy passwordHash ────────────

export const adminUserListSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const adminUserDetailSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  dateOfBirth: true,
  role: true,
  isActive: true,
  lockedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type AdminUserListRecord = Prisma.UserGetPayload<{
  select: typeof adminUserListSelect;
}>;
export type AdminUserDetailRecord = Prisma.UserGetPayload<{
  select: typeof adminUserDetailSelect;
}>;
