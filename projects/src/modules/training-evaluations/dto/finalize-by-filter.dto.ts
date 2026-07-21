import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

function emptyToUndefined({ value }: TransformFnParams): unknown {
  return value === '' ? undefined : value;
}

export class FinalizeByFilterDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  semesterId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  facultyId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  classId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  confirmLargeAction?: boolean = false;
}
