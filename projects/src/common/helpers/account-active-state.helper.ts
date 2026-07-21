import type { Prisma } from '../../generated/prisma/client';

/**
 * Sinh dữ liệu cập nhật đồng bộ isActive/lockedAt/refreshToken khi khóa/mở khóa tài khoản.
 * Dùng chung cho admin-users và admin-students vì cả 2 module đều thao tác trên bảng User:
 * khóa (isActive=false) sẽ set lockedAt=hiện tại và xóa refresh token để chặn phiên cũ;
 * mở khóa (isActive=true) sẽ xóa lockedAt.
 */
export function buildAccountActiveStateData(
  isActive: boolean,
): Prisma.UserUpdateInput {
  if (isActive) {
    return { isActive: true, lockedAt: null };
  }

  return {
    isActive: false,
    lockedAt: new Date(),
    refreshTokenHash: null,
    refreshTokenExpiresAt: null,
  };
}
