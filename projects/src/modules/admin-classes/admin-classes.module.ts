import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AdminStudentsModule } from '../admin-students/admin-students.module';
import { AdminClassCatalogRepository } from './admin-class-catalog.repository';
import { AdminClassCatalogService } from './admin-class-catalog.service';
import {
  AdminClassesController,
  AdminStudentsController,
} from './admin-classes.controller';
import { AdminClassesService } from './admin-classes.service';

@Module({
  imports: [PrismaModule, AdminStudentsModule],
  controllers: [AdminClassesController, AdminStudentsController],
  providers: [
    AdminClassesService,
    AdminClassCatalogService,
    AdminClassCatalogRepository,
  ],
})
export class AdminClassesModule {}
