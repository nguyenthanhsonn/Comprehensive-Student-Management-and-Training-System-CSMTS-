import { Prisma } from '../../../generated/prisma/client';

export const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  phone: true,
  dateOfBirth: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const authProfileUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
} satisfies Prisma.UserSelect;

export const loginUserSelect = {
  id: true,
  email: true,
  passwordHash: true,
  role: true,
  isActive: true,
} satisfies Prisma.UserSelect;

export const passwordUserSelect = {
  id: true,
  passwordHash: true,
} satisfies Prisma.UserSelect;

export const refreshTokenUserSelect = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  refreshTokenHash: true,
  refreshTokenExpiresAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

export type AuthProfileUser = Prisma.UserGetPayload<{
  select: typeof authProfileUserSelect;
}>;

export type LoginUser = Prisma.UserGetPayload<{
  select: typeof loginUserSelect;
}>;

export type PasswordUser = Prisma.UserGetPayload<{
  select: typeof passwordUserSelect;
}>;

export type RefreshTokenUser = Prisma.UserGetPayload<{
  select: typeof refreshTokenUserSelect;
}>;
