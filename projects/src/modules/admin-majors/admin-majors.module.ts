import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AdminMajorsController } from './admin-majors.controller';
import { AdminMajorsRepository } from './admin-majors.repository';
import { AdminMajorsService } from './admin-majors.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminMajorsController],
  providers: [AdminMajorsService, AdminMajorsRepository],
})
export class AdminMajorsModule {}
