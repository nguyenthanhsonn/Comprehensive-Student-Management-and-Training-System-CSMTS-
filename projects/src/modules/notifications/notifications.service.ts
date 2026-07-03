import { Injectable, NotFoundException } from '@nestjs/common';
import { FormStatus, SemesterNo } from '../../generated/prisma/client';
import { UserRole, type PaginatedResult } from '../../common/shared';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import type { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import {
  notificationSelect,
  type NotificationRecord,
} from './selects/notification.select';
import type { NotificationResponse } from './types/notification.types';

const EVALUATION_REMINDER_TITLE = 'Nhắc nhở đánh giá rèn luyện';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async findMine(
    userId: string,
    role: UserRole,
    query: GetNotificationsQueryDto,
  ): Promise<PaginatedResult<NotificationResponse>> {
    await this.createEvaluationReminderIfNeeded(userId, role);

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        select: notificationSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items: notifications.map(mapToNotificationResponse),
      page,
      limit,
      total,
    };
  }

  async countUnread(
    userId: string,
    role: UserRole,
  ): Promise<{ unreadCount: number }> {
    await this.createEvaluationReminderIfNeeded(userId, role);

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount };
  }

  async markAsRead(
    userId: string,
    id: string,
  ): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
      select: notificationSelect,
    });

    return mapToNotificationResponse(updated);
  }

  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { updatedCount: result.count };
  }

  emitCreated(notification: NotificationResponse) {
    this.notificationsGateway.emitNotification(
      notification.userId,
      notification,
    );
  }

  private async createEvaluationReminderIfNeeded(
    userId: string,
    role: UserRole,
  ) {
    if (role !== UserRole.Student) {
      return;
    }

    const activeSemester = await this.prisma.semester.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        year: true,
        semester: true,
        studentDeadline: true,
      },
      orderBy: [{ year: 'desc' }, { semester: 'desc' }],
    });

    if (!activeSemester) {
      return;
    }

    const evaluation = await this.prisma.evaluationForm.findFirst({
      where: {
        studentId: userId,
        semesterId: activeSemester.id,
      },
      select: { status: true },
    });

    if (
      evaluation &&
      !([FormStatus.draft, FormStatus.rejected] as FormStatus[]).includes(
        evaluation.status,
      )
    ) {
      return;
    }

    const semesterLabel = toSemesterLabel(activeSemester.semester);
    const deadlineText = activeSemester.studentDeadline
      ? ` Hạn nộp: ${formatVietnamDate(activeSemester.studentDeadline)}.`
      : '';
    const content = `Bạn chưa nộp phiếu đánh giá rèn luyện ${semesterLabel} năm học ${activeSemester.year}.${deadlineText} Vui lòng hoàn thành và nộp phiếu đúng hạn.`;

    const existed = await this.prisma.notification.findFirst({
      where: {
        userId,
        title: EVALUATION_REMINDER_TITLE,
        content,
      },
      select: { id: true },
    });

    if (existed) {
      return;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title: EVALUATION_REMINDER_TITLE,
        content,
      },
      select: notificationSelect,
    });

    this.emitCreated(mapToNotificationResponse(notification));
  }
}

export function mapToNotificationResponse(
  notification: NotificationRecord,
): NotificationResponse {
  return {
    id: notification.id,
    userId: notification.userId,
    title: notification.title,
    content: notification.content,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };
}

function toSemesterLabel(semester: SemesterNo) {
  const labels: Record<SemesterNo, string> = {
    [SemesterNo.SEMESTER_1]: 'học kỳ 1',
    [SemesterNo.SEMESTER_2]: 'học kỳ 2',
    [SemesterNo.summer]: 'học kỳ hè',
  };

  return labels[semester];
}

function formatVietnamDate(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}
