import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AdminFacultiesController } from './admin-faculties.controller';
import { AdminFacultiesService } from './admin-faculties.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminFacultiesController],
  providers: [AdminFacultiesService],
})
export class AdminFacultiesModule {}
