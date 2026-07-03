import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AdminClassesController } from './admin-classes.controller';
import { AdminClassesService } from './admin-classes.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminClassesController],
  providers: [AdminClassesService],
})
export class AdminClassesModule {}
