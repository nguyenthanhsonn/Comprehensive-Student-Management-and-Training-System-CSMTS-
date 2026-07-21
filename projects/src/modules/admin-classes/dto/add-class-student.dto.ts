import { IsString, IsUUID, MaxLength } from 'class-validator';

export class AddClassStudentDto {
  @IsUUID()
  studentId: string;

  @IsString()
  @MaxLength(20)
  studentCode: string;
}
