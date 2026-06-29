import type { UserRole } from 'src/common/shared';

export type TokenSubject = {
  id: string;
  email: string;
  role: UserRole;
};

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  jti?: string;
  iat?: number;
  exp?: number;
};
