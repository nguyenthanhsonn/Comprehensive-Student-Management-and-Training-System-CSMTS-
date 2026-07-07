import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  normalizeUsername,
  USERNAME_FORMAT_MESSAGE,
  USERNAME_PATTERN,
} from 'src/common/helpers/username.helper';

/**
 * Cập nhật hồ sơ sinh viên - sửa thông tin User và/hoặc enrollment (lớp học/mã sinh viên).
 * Không cho đổi userId (giữ nguyên chủ sở hữu hồ sơ), không cho đổi role ở đây
 * (đổi vai trò dùng PATCH /admin/users/:id/role qua module admin-users).
 */
export class UpdateStudentDto {
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
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  studentCode?: string;
}
