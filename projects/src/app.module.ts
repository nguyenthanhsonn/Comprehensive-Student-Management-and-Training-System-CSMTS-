import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { AppController } from './app.controller';
import appConfig from './config/app.config';
import { validateEnvironment } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { AdminClassesModule } from './modules/admin-classes/admin-classes.module';
import { AuthModule } from './modules/auth/auth.module';
import { EvidencesModule } from './modules/evidences/evidences.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PostsModule } from './modules/posts/posts.module';
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
    AuthModule,
    UsersModule,
    StudentsModule,
    TrainingEvaluationsModule,
    EvidencesModule,
    NotificationsModule,
    PostsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
