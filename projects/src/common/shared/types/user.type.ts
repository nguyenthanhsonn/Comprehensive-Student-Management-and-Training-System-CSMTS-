import type { UserRole } from '../enums/user-role.enum';

export type User = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
};

export type CreateUserDto = Pick<
  User,
  'username' | 'email' | 'fullName' | 'role'
> & {
  password: string;
};
