import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import {
  AdminClassesController,
  AdminStudentsController,
} from './admin-classes.controller';
import { AdminClassesService } from './admin-classes.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminClassesController, AdminStudentsController],
  providers: [AdminClassesService],
})
export class AdminClassesModule {}
