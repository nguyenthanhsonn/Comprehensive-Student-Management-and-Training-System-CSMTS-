import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { UserRole } from 'src/common/shared';
import {
  normalizeUsername,
  USERNAME_FORMAT_MESSAGE,
  USERNAME_PATTERN,
} from 'src/common/helpers/username.helper';

/**
 * Cập nhật thông tin tài khoản. Không cho sửa password ở đây (dùng /auth/change-password).
 * Cho phép sửa role và isActive trực tiếp - nếu isActive chuyển về false, service sẽ tự
 * đồng bộ lockedAt và thu hồi refresh token giống hành động khóa tài khoản.
 */
export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  /** Cho phép đổi username nhưng phải kiểm tra unique ở service. */
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? normalizeUsername(value) : value,
  )
  @IsString()
  @Length(3, 50)
  @Matches(USERNAME_PATTERN, { message: USERNAME_FORMAT_MESSAGE })
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
