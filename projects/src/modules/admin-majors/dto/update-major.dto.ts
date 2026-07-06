import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateMajorDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsUUID()
  facultyId?: string;
}
