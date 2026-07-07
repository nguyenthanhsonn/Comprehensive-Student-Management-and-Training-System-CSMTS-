import type { UserRole } from 'src/common/shared';

export type AuthenticatedUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  accessTokenId: string;
  tokenIssuedAt?: number;
  tokenExpiresAt?: number;
};

export type RequestWithUser = {
  user: AuthenticatedUser;
};
