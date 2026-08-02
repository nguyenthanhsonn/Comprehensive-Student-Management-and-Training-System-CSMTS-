import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';

function emptyToUndefined({ value }: TransformFnParams): unknown {
  return value === '' ? undefined : value;
}

/** Query cho GET /metadata/majors - lọc ngành theo khoa. */
export class MajorsQueryDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  facultyId?: string;
}

/** Query cho GET /metadata/classes - lọc lớp theo ngành. */
export class ClassesQueryDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  majorId?: string;
}
