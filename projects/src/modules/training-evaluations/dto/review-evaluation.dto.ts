import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export type ReviewAction = 'APPROVE' | 'REJECT';

export class ReviewEvaluationDto {
  @IsIn(['APPROVE', 'REJECT'])
  action: ReviewAction;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
