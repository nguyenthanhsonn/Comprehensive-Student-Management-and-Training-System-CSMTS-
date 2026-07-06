import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { AppController } from './app.controller';
import appConfig from './config/app.config';
import { validateEnvironment } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { AdminClassesModule } from './modules/admin-classes/admin-classes.module';
import { AdminFacultiesModule } from './modules/admin-faculties/admin-faculties.module';
import { AdminMajorsModule } from './modules/admin-majors/admin-majors.module';
import { AuthModule } from './modules/auth/auth.module';
import { CouncilAssignmentsModule } from './modules/council-assignments/council-assignments.module';
import { EvidencesModule } from './modules/evidences/evidences.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PostsModule } from './modules/posts/posts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StudentsModule } from './modules/students/students.module';
import { TrainingEvaluationsModule } from './modules/training-evaluations/training-evaluations.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '../../.env'),
      ],
      isGlobal: true,
      cache: true,
      load: [appConfig],
      validate: validateEnvironment,
    }),
    PrismaModule,
    AdminClassesModule,
    AdminFacultiesModule,
    AdminMajorsModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    TrainingEvaluationsModule,
    EvidencesModule,
    NotificationsModule,
    MetadataModule,
    CouncilAssignmentsModule,
    ReportsModule,
    PostsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
