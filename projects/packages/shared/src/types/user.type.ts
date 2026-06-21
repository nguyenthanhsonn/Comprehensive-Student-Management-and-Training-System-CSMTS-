import type { UserRole } from '../enums/user-role.enum';

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
};

export type CreateUserDto = Pick<User, 'email' | 'fullName' | 'role'> & {
  password: string;
};
