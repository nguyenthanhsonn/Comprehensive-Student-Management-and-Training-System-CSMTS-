import { IsOptional, IsUUID, Matches, IsIn } from 'class-validator';
import { TRAINING_EVALUATION_SEMESTERS } from '../../training-evaluations/dto/create-training-evaluation.dto';
import type { TrainingEvaluationSemester } from '../../training-evaluations/dto/create-training-evaluation.dto';

/** Query dùng chung cho các API gom nhóm số liệu (overview, training-results, by-class, by-faculty). */
export class ReportsAggregateQueryDto {
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
}
