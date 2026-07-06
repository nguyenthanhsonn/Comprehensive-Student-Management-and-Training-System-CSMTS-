import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

/** Cập nhật hồ sơ sinh viên — không cho đổi userId (đổi chủ sở hữu hồ sơ không hợp lý). */
export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  studentCode?: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
