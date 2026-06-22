import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import appConfig from './config/app.config';
import { validateEnvironment } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PostsModule } from './modules/posts/posts.module';
import { StudentsModule } from './modules/students/students.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      validate: validateEnvironment,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    PostsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
