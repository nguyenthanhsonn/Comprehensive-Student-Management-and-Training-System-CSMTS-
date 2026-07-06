import type { UserRole } from '../../../../generated/prisma/client';

/** Response dạng danh sách — tuyệt đối không chứa passwordHash/refreshToken. */
export type AdminUserListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isLocked: boolean;
  createdAt: Date;
};

/** Response chi tiết — kế thừa danh sách, thêm vài field mở rộng. */
export type AdminUserDetail = AdminUserListItem & {
  dateOfBirth: Date | null;
  lockedAt: Date | null;
  updatedAt: Date;
};
