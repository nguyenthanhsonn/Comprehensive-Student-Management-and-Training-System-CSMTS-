import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../database/prisma.module';
import { AdminStudentsController } from './admin-students.controller';
import { AdminStudentsRepository } from './admin-students.repository';
import { AdminStudentsService } from './admin-students.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminStudentsController],
  providers: [AdminStudentsService, AdminStudentsRepository],
})
export class AdminStudentsModule {}
