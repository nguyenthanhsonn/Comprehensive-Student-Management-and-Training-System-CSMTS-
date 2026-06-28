import { IsEmail, IsOptional, IsString } from 'class-validator';


export class UpdateStudentContactDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
