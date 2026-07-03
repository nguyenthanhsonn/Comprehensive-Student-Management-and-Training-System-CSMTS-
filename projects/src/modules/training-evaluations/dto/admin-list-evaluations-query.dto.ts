import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { FormStatus } from '../../../generated/prisma/client';
import { TRAINING_EVALUATION_SEMESTERS } from './create-training-evaluation.dto';
import type { TrainingEvaluationSemester } from './create-training-evaluation.dto';

const FORM_STATUS_VALUES = Object.values(FormStatus);

/**
 * Query params cho API admin lấy danh sách toàn bộ phiếu đánh giá.
 * `semester` và `academicYear` phải đi kèm nhau (validate ở service).
 */
export class AdminListEvaluationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsIn(FORM_STATUS_VALUES)
  status?: FormStatus;

  @IsOptional()
  @IsIn(TRAINING_EVALUATION_SEMESTERS)
  semester?: TrainingEvaluationSemester;

  @IsOptional()
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'academicYear phải theo định dạng YYYY-YYYY',
  })
  academicYear?: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsUUID()
  facultyId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
