import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStudentContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
