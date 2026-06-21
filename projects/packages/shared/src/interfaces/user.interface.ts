import type { UserRole } from '../enums/user-role.enum';

export interface IUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}
