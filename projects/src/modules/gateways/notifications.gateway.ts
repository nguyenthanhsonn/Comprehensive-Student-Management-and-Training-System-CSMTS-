import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { NotificationResponse } from '../notifications/types/notification.types';

type JoinNotificationRoomPayload = {
  userId?: string;
};

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: process.env.FRONTEND_URL ?? true,
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  handleConnection(client: Socket) {
    client.emit('notifications:connected', {
      socketId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    client.rooms.forEach((room) => {
      if (room !== client.id) {
        void client.leave(room);
      }
    });
  }

  @SubscribeMessage('notifications:join')
  joinUserRoom(
    @MessageBody() payload: JoinNotificationRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = payload.userId?.trim();

    if (!userId || !isUuid(userId)) {
      client.emit('notifications:error', {
        message: 'userId không hợp lệ',
      });
      return;
    }

    void client.join(this.getUserRoom(userId));
    client.emit('notifications:joined', { userId });
  }

  emitNotification(userId: string, notification: NotificationResponse) {
    this.server
      .to(this.getUserRoom(userId))
      .emit('notifications:new', notification);
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
