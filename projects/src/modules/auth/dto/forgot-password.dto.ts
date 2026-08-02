import { Transform, type TransformFnParams } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class ForgotPasswordDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(3, 255)
  identifier: string;
}
