export type NotificationResponse = {
  id: string;
  userId: string;
  type: string | null;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
};
