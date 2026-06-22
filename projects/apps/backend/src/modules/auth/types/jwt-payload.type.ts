import type { UserRole } from '@smaste/shared';

export type JwtTokenType = 'access' | 'refresh';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  tokenType: JwtTokenType;
  jti: string;
  iat?: number;
  exp?: number;
};
