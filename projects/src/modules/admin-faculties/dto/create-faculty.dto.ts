import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateFacultyDto {
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/)
  code: string;

  @IsString()
  @MaxLength(255)
  name: string;
}
