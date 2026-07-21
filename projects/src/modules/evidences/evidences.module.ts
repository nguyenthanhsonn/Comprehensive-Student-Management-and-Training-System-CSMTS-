import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { EvidencesController } from './evidences.controller';
import { EvidencesService } from './evidences.service';

@Module({
  imports: [PrismaModule],
  controllers: [EvidencesController],
  providers: [EvidencesService],
})
export class EvidencesModule {}
