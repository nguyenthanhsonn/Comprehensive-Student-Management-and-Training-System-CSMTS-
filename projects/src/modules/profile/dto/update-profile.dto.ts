import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import {
  DATE_ONLY_FORMAT_MESSAGE,
  DATE_ONLY_PATTERN,
} from 'src/common/helpers/date-only.helper';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: DATE_ONLY_FORMAT_MESSAGE })
  dateOfBirth?: string | null;
}
