import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateTrainingEvaluationDraftDto {
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_, value: unknown) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[0-9]{9,15}$/, {
    message: 'phone must contain 9 to 15 digits and may start with +',
  })
  phone?: string | null;

  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_, value: unknown) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}
