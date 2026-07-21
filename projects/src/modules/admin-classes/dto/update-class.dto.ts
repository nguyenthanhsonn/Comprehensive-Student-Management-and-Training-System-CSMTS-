import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Z0-9_-]+$/)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsUUID()
  majorId?: string;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  enrollmentYear?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
