import { IsEnum } from 'class-validator';
import { UserRole } from 'src/common/shared';

/** Cập nhật vai trò tài khoản — dùng riêng, tách khỏi endpoint update thông tin chung. */
export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
