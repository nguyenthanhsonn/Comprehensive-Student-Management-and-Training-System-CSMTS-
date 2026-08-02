import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import {
  AdminMajorsController,
  FacultyMajorsController,
  MajorsController,
} from './admin-majors.controller';
import { AdminMajorsRepository } from './admin-majors.repository';
import { AdminMajorsService } from './admin-majors.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminMajorsController, FacultyMajorsController, MajorsController],
  providers: [AdminMajorsService, AdminMajorsRepository],
})
export class AdminMajorsModule {}
