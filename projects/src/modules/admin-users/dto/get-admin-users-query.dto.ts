import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UserRole } from 'src/common/shared';

const MANAGED_USER_ROLES = [
  UserRole.Admin,
  UserRole.ClassLeader,
  UserRole.Advisor,
  UserRole.Faculty,
  UserRole.TrainingDepartment,
];

/** Chuyển chuỗi "true"/"false" từ query string sang boolean thật (tránh Boolean("false") = true). */
function toBoolean({ value }: TransformFnParams): unknown {
  if (value === 'true' || value === true) {
    return true;
  }

  if (value === 'false' || value === false) {
    return false;
  }

  return value;
}

export class GetAdminUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @IsEnum(UserRole)
  @IsIn(MANAGED_USER_ROLES, {
    message: 'API /admin/users chỉ quản lý admin, lớp trưởng, cố vấn học tập, khoa và phòng đào tạo',
  })
  role?: UserRole;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  /** Mặc định false - chỉ admin cần xem lại tài khoản đã xóa mềm mới bật cờ này. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeDeleted = false;
}
