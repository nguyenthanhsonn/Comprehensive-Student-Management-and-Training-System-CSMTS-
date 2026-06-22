import type { UserRole } from '@smaste/shared';

export type AuthenticatedUser = {
  id: string;
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
