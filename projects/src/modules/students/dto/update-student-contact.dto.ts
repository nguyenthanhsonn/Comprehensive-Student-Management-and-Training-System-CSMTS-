import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateStudentContactDto {
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[0-9]{9,15}$/, {
    message: 'phone must contain 9 to 15 digits and may start with +',
  })
  phone?: string | null;
}
