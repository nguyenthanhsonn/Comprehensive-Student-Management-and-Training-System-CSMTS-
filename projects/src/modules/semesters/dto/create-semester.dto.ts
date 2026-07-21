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
import type { ApiSemester } from '../types/api-semester.type';

export const API_SEMESTERS: ApiSemester[] = ['HK1', 'HK2', 'SUMMER'];

export class CreateSemesterDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsString()
  @IsIn(API_SEMESTERS, { message: 'Học kỳ phải là HK1, HK2 hoặc SUMMER' })
  semester: ApiSemester;

  @Matches(DATE_ONLY_PATTERN, { message: DATE_ONLY_FORMAT_MESSAGE })
  startDate: string;

  @Matches(DATE_ONLY_PATTERN, { message: DATE_ONLY_FORMAT_MESSAGE })
  endDate: string;

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
