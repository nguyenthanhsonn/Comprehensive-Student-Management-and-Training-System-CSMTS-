import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { AdminSemestersController } from './admin-semesters.controller';
import { AdminSemestersService } from './admin-semesters.service';
import { SemestersController } from './semesters.controller';
import { SemestersService } from './semesters.service';

@Module({
  imports: [PrismaModule, GatewaysModule],
  controllers: [SemestersController, AdminSemestersController],
  providers: [SemestersService, AdminSemestersService],
})
export class SemestersModule {}
