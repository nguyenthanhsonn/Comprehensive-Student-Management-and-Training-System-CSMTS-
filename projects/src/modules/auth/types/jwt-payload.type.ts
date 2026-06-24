import type { UserRole } from 'src/common/shared';

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
