import type { User, UserRole } from 'src/common/shared';
import type { AuthProfileUser } from '../selects/user.select';

export function mapAuthProfileToUser(user: AuthProfileUser): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role as UserRole,
    isActive: user.isActive,
  };
}
