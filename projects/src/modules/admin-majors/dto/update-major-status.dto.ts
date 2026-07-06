import { IsBoolean } from 'class-validator';

export class UpdateMajorStatusDto {
  @IsBoolean()
  isActive: boolean;
}
