import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Cập nhật thông tin cơ bản của tài khoản.
 * Không cho sửa password ở đây (dùng /auth/change-password) và không cho sửa role
 * (dùng endpoint riêng PATCH /admin/users/:id/role).
 */
export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
