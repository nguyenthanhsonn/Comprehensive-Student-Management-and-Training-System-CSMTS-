import { ArrayMinSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class SubmitClassToFacultyDto {
  @IsOptional()
  @IsUUID('4')
  semesterId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  evaluationIds?: string[];
}
