import { ConflictException, ForbiddenException } from '@nestjs/common';
import { FormStatus } from '../../../generated/prisma/client';
import { UserRole } from 'src/common/shared';

/** Cấu hình 1 bước duyệt: trạng thái yêu cầu, trạng thái tiếp theo khi approve, tiền tố ghi chú khi reject. */
export type ReviewStageConfig = {
  requiredStatus: FormStatus;
  nextApprovedStatus: FormStatus;
  notePrefix: string;
};

/**
 * Ánh xạ role → bước duyệt tương ứng trong luồng:
 * submitted → (lớp trưởng) → class_leader_approved → (CVHT) → class_approved → (khoa) → faculty_approved → (PĐT) → finalized
 */
const REVIEW_STAGES: Partial<Record<UserRole, ReviewStageConfig>> = {
  [UserRole.Advisor]: {
    requiredStatus: FormStatus.class_leader_approved,
    nextApprovedStatus: FormStatus.class_approved,
    notePrefix: '[CVHT trả về]',
  },
  [UserRole.ClassLeader]: {
    requiredStatus: FormStatus.submitted,
    nextApprovedStatus: FormStatus.class_leader_approved,
    notePrefix: '[Lớp trả về]',
  },
  [UserRole.Admin]: {
    requiredStatus: FormStatus.faculty_approved,
    nextApprovedStatus: FormStatus.finalized,
    notePrefix: '[Học viện trả về]',
  },
};

/**
 * Xác định cấu hình bước duyệt theo role người gọi, đồng thời kiểm tra phiếu
 * có đang ở đúng trạng thái chờ duyệt của bước đó hay không.
 *
 * @throws ForbiddenException nếu role không có quyền duyệt (không lọt qua RolesGuard được thì không tới đây)
 * @throws ConflictException nếu phiếu không ở đúng trạng thái chờ duyệt của bước này
 */
export function resolveReviewStage(
  role: UserRole,
  currentStatus: FormStatus,
): ReviewStageConfig {
  const stage = REVIEW_STAGES[role];

  if (!stage) {
    throw new ForbiddenException('Vai trò này không có quyền duyệt phiếu đánh giá');
  }

  if (currentStatus !== stage.requiredStatus) {
    throw new ConflictException(
      `Phiếu hiện không ở trạng thái chờ duyệt của bạn (yêu cầu trạng thái: ${stage.requiredStatus})`,
    );
  }

  return stage;
}
