import { IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateMajorDto {
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/)
  code: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsUUID()
  facultyId: string;
}
