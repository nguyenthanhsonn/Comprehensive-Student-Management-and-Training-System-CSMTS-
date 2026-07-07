import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from 'src/common/shared';
import {
  normalizeUsername,
  USERNAME_FORMAT_MESSAGE,
  USERNAME_PATTERN,
} from 'src/common/helpers/username.helper';

/** Dữ liệu tạo tài khoản mới - mật khẩu sẽ được hash bằng bcrypt trước khi lưu. */
export class CreateAdminUserDto {
  @IsString()
  @MaxLength(255)
  fullName: string;

  /** Tên đăng nhập - dùng để login, phải là duy nhất trong hệ thống. */
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? normalizeUsername(value) : value,
  )
  @IsString()
  @Length(3, 50)
  @Matches(USERNAME_PATTERN, { message: USERNAME_FORMAT_MESSAGE })
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
