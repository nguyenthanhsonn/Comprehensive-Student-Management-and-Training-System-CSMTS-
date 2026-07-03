import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { MetadataController } from './metadata.controller';
import { MetadataService } from './metadata.service';

@Module({
  imports: [PrismaModule],
  controllers: [MetadataController],
  providers: [MetadataService],
})
export class MetadataModule {}
