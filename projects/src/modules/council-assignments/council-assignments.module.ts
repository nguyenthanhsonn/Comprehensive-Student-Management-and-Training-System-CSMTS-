import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CouncilAssignmentsController } from './council-assignments.controller';
import { CouncilAssignmentsService } from './council-assignments.service';

@Module({
  imports: [PrismaModule],
  controllers: [CouncilAssignmentsController],
  providers: [CouncilAssignmentsService],
})
export class CouncilAssignmentsModule {}
