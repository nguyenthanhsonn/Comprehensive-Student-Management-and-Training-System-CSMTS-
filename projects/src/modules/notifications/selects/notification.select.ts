import { Prisma } from '../../../generated/prisma/client';

export const notificationSelect = {
  id: true,
  userId: true,
  title: true,
  content: true,
  isRead: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export type NotificationRecord = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;
