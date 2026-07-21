import { IsBoolean } from 'class-validator';

export class ToggleSemesterActiveDto {
  @IsBoolean()
  isActive: boolean;
}
