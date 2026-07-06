import { IsInt, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Z0-9_-]+$/)
  code: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsUUID()
  majorId: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  enrollmentYear: number;
}
