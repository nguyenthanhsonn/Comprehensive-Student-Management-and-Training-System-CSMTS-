import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

/**
 * Dữ liệu tạo hồ sơ sinh viên.
 * Không nhận fullName/facultyId/majorId/admissionYear — các field này lấy từ
 * User.fullName sẵn có và suy ra qua classId (Class → Major → Faculty, enrollmentYear),
 * tránh lưu trùng lặp dữ liệu.
 */
export class CreateStudentDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(2)
  studentCode: string;

  @IsUUID()
  classId: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
