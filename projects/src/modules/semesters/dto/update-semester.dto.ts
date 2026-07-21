import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  DATE_ONLY_FORMAT_MESSAGE,
  DATE_ONLY_PATTERN,
} from '../../../common/helpers/date-only.helper';
import {
  API_SEMESTERS,
  type CreateSemesterDto,
} from './create-semester.dto';
import type { ApiSemester } from '../types/api-semester.type';

export class UpdateSemesterDto implements Partial<CreateSemesterDto> {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  @IsIn(API_SEMESTERS, { message: 'Học kỳ phải là HK1, HK2 hoặc SUMMER' })
  semester?: ApiSemester;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: DATE_ONLY_FORMAT_MESSAGE })
  startDate?: string;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: DATE_ONLY_FORMAT_MESSAGE })
  endDate?: string;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: DATE_ONLY_FORMAT_MESSAGE })
  studentDeadline?: string;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: DATE_ONLY_FORMAT_MESSAGE })
  classDeadline?: string;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: DATE_ONLY_FORMAT_MESSAGE })
  facultyDeadline?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
