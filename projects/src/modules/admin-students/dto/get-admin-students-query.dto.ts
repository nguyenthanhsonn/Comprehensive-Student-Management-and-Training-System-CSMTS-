import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function toBoolean({ value }: TransformFnParams): unknown {
  if (value === '') {
    return undefined;
  }

  if (value === 'true' || value === true) {
    return true;
  }

  if (value === 'false' || value === false) {
    return false;
  }

  return value;
}

function emptyToUndefined({ value }: TransformFnParams): unknown {
  return value === '' ? undefined : value;
}

export class GetAdminStudentsQueryDto {
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
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  classId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  facultyId?: string;

  /** Mặc định false - chỉ bật khi admin cần xem lại sinh viên đã xóa mềm. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeDeleted = false;
}
