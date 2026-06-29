import { Numeric } from 'zod/v4/core/util.cjs';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
