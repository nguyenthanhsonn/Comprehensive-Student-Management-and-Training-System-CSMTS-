import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, GatewaysModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
