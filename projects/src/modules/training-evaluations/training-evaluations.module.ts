import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AdminTrainingEvaluationsController } from './admin-training-evaluations.controller';
import { AdminTrainingEvaluationsService } from './admin-training-evaluations.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { TrainingEvaluationsController } from './training-evaluations.controller';
import { TrainingEvaluationsService } from './training-evaluations.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [
    TrainingEvaluationsController,
    AdminTrainingEvaluationsController,
  ],
  providers: [TrainingEvaluationsService, AdminTrainingEvaluationsService],
})
export class TrainingEvaluationsModule {}
