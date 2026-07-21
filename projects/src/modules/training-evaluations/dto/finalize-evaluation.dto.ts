import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class FinalizeEvaluationDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  finalScore?: number;
}
