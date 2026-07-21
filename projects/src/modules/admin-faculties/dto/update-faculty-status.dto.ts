import { IsBoolean } from 'class-validator';

export class UpdateFacultyStatusDto {
  @IsBoolean()
  isActive: boolean;
}
