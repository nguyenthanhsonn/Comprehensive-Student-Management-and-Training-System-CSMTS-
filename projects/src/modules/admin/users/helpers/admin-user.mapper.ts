import type {
  AdminUserDetailRecord,
  AdminUserListRecord,
} from '../selects/admin-user.select';
import type { AdminUserDetail, AdminUserListItem } from '../types/admin-user.types';

/** Chuyển record User (đã lọc field an toàn) sang response dạng danh sách. */
export function mapToAdminUserListItem(user: AdminUserListRecord): AdminUserListItem {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isLocked: !user.isActive,
    createdAt: user.createdAt,
  };
}

/** Chuyển record User sang response chi tiết. */
export function mapToAdminUserDetail(user: AdminUserDetailRecord): AdminUserDetail {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isLocked: !user.isActive,
    lockedAt: user.lockedAt,
    dateOfBirth: user.dateOfBirth,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
