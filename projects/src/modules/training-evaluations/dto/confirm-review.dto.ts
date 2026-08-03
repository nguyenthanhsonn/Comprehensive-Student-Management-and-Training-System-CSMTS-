import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewScoreItemDto } from './review-scores.dto';

export class ConfirmReviewDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReviewScoreItemDto)
  scores?: ReviewScoreItemDto[];
}
