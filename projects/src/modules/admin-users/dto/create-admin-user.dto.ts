import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from 'src/common/shared';
import {
  DATE_ONLY_FORMAT_MESSAGE,
  DATE_ONLY_PATTERN,
} from 'src/common/helpers/date-only.helper';
import {
  normalizeUsername,
  USERNAME_FORMAT_MESSAGE,
  USERNAME_PATTERN,
} from 'src/common/helpers/username.helper';

const MANAGED_USER_ROLES = [
  UserRole.Admin,
  UserRole.Advisor,
  UserRole.ClassLeader,
  UserRole.Faculty,
  UserRole.TrainingDepartment,
];

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

  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  @IsIn(MANAGED_USER_ROLES, {
    message: 'Không thể tạo tài khoản sinh viên tại đây. Vui lòng tạo tài khoản sinh viên tại chức năng quản lý sinh viên.',
  })
  role: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: DATE_ONLY_FORMAT_MESSAGE })
  dateOfBirth?: string;

  @ValidateIf((dto: CreateAdminUserDto) => dto.role === UserRole.Faculty)
  @IsUUID('4', { message: 'Vui lòng chọn khoa quản lý' })
  facultyId?: string;

  @ValidateIf(
    (dto: CreateAdminUserDto) =>
      dto.role === UserRole.Advisor || dto.role === UserRole.ClassLeader,
  )
  @IsUUID('4', { message: 'Vui lòng chọn lớp phụ trách' })
  classId?: string;
}
