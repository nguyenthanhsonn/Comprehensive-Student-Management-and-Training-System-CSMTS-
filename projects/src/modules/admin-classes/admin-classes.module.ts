import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AdminStudentsModule } from '../admin-students/admin-students.module';
import { MailModule } from '../mail/mail.module';
import { AdminClassCatalogRepository } from './admin-class-catalog.repository';
import { AdminClassCatalogService } from './admin-class-catalog.service';
import {
  AdminClassesController,
  AdminStudentsController,
  ClassLeaderClassesController,
} from './admin-classes.controller';
import { AdminClassesService } from './admin-classes.service';

@Module({
  imports: [PrismaModule, AdminStudentsModule, MailModule],
  controllers: [
    AdminClassesController,
    AdminStudentsController,
    ClassLeaderClassesController,
  ],
  providers: [
    AdminClassesService,
    AdminClassCatalogService,
    AdminClassCatalogRepository,
  ],
})
export class AdminClassesModule {}
