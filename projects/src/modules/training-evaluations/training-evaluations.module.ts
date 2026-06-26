import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { TrainingEvaluationsController } from './training-evaluations.controller';
import { TrainingEvaluationsService } from './training-evaluations.service';

@Module({
  imports: [PrismaModule],
  controllers: [TrainingEvaluationsController],
  providers: [TrainingEvaluationsService],
})
export class TrainingEvaluationsModule {}
