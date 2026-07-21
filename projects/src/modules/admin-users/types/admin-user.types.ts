import type { UserRole } from 'src/common/shared';

/** Response tài khoản cho admin - không chứa passwordHash/refreshTokenHash. */
export type AdminUserResponse = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  dateOfBirth: string | null;
  role: UserRole;
  isActive: boolean;
  lockedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  managedClasses: Array<{
    id: string;
    code: string;
    name: string;
    assignedAt: Date;
  }>;
  accountEmailSent?: boolean;
  accountEmailError?: string | null;
};
