import type { User } from './user.type';

export type LoginDto = {
  email: string;
  password: string;
};

export type AuthTokens = {
  accessToken: string;
};

export type AuthSession = AuthTokens & {
  user: User;
};
