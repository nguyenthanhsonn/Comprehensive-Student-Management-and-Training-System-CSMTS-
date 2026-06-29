import { IsIn, Matches } from 'class-validator';

export const TRAINING_EVALUATION_SEMESTERS = ['HK1', 'HK2', 'SUMMER'] as const;
export type TrainingEvaluationSemester =
  (typeof TRAINING_EVALUATION_SEMESTERS)[number];

export class CreateTrainingEvaluationDto {
  @IsIn(TRAINING_EVALUATION_SEMESTERS)
  semester: TrainingEvaluationSemester;

  @Matches(/^\d{4}-\d{4}$/, {
    message: 'academicYear must use format YYYY-YYYY',
  })
  academicYear: string;
}
