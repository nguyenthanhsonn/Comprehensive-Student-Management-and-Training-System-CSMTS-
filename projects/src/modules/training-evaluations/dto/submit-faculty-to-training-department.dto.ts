import { IsOptional, IsUUID } from 'class-validator';

export class SubmitFacultyToTrainingDepartmentDto {
  @IsOptional()
  @IsUUID('4')
  semesterId?: string;

  @IsOptional()
  @IsUUID('4')
  classId?: string;
}
