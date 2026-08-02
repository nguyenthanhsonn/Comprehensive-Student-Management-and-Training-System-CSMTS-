import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AdminFacultiesController, FacultiesController } from './admin-faculties.controller';
import { AdminFacultiesRepository } from './admin-faculties.repository';
import { AdminFacultiesService } from './admin-faculties.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminFacultiesController, FacultiesController],
  providers: [AdminFacultiesService, AdminFacultiesRepository],
})
export class AdminFacultiesModule {}
