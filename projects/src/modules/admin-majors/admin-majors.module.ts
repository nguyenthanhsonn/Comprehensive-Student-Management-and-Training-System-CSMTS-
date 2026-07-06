import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AdminMajorsController } from './admin-majors.controller';
import { AdminMajorsService } from './admin-majors.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminMajorsController],
  providers: [AdminMajorsService],
})
export class AdminMajorsModule {}
