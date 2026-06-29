import { BadRequestException, ConflictException } from '@nestjs/common';
import { EvalRank, FormStatus } from '../../../generated/prisma/client';
import {
  LEADER_TASK_COMPLETION_POINTS,
  MANAGEMENT_SKILL_POINTS,
  MEMBER_TASK_COMPLETION_POINTS,
  SPECIAL_ACHIEVEMENT_POINTS,
} from '../constants/score-points.constant';
import type {
  PositionGroup,
  TaskCompletionLevel,
} from '../dto/update-role-score.dto';
import { UpdateRoleScoreDto } from '../dto/update-role-score.dto';

/** Đầu vào cho việc tính tổng điểm rèn luyện */
export type ScoreInput = {
  studyScore: number;
  disciplineScore: number;
  activityScore: number;
  communityScore: number;
  roleScore: number;
};

/** Kết quả sau khi tính điểm: tổng điểm và xếp loại */
export type ScoreResult = {
  totalScore: number;
  rank: EvalRank;
};

/**
 * Kiểm tra phiếu có đang ở trạng thái có thể chỉnh sửa không.
 * Chỉ cho phép sửa khi phiếu ở trạng thái draft hoặc bị trả về (rejected).
 *
 * @throws ConflictException nếu phiếu đã nộp hoặc đã duyệt
 */
export function assertEditable(status: FormStatus): void {
  const editableStatuses: FormStatus[] = [
    FormStatus.draft,
    FormStatus.rejected,
  ];

  if (!editableStatuses.includes(status)) {
    throw new ConflictException('Only draft evaluations can be updated');
  }
}

/**
 * Tính tổng điểm rèn luyện từ 5 mục thành phần và trả về xếp loại tương ứng.
 * Tổng điểm được giới hạn tối đa 100 điểm.
 *
 * @param scores - Điểm từng mục (I đến V)
 * @returns Tổng điểm và xếp loại rèn luyện
 */
export function calculateScoreResult(scores: ScoreInput): ScoreResult {
  const totalScore = Math.min(
    100,
    scores.studyScore +
      scores.disciplineScore +
      scores.activityScore +
      scores.communityScore +
      scores.roleScore,
  );

  return {
    totalScore,
    rank: calculateClassification(totalScore),
  };
}

/**
 * Phân loại kết quả rèn luyện dựa trên tổng điểm theo QĐ 4185/QĐ-HCQG:
 * - Xuất sắc: ≥ 90
 * - Tốt:      80 – 89
 * - Khá:      65 – 79
 * - Trung bình: 50 – 64
 * - Yếu:      35 – 49
 * - Kém:      < 35
 */
export function calculateClassification(totalScore: number): EvalRank {
  if (totalScore >= 90) return EvalRank.excellent;
  if (totalScore >= 80) return EvalRank.good;
  if (totalScore >= 65) return EvalRank.fair;
  if (totalScore >= 50) return EvalRank.average;
  if (totalScore >= 35) return EvalRank.weak;

  return EvalRank.poor;
}

/**
 * Tính điểm Mục V – Vai trò BCS lớp / BCH tổ chức (tối đa 10 điểm).
 *
 * Có hai nhánh tính:
 * - NORMAL_STUDENT: điểm hoạt động thông thường + thành tích đặc biệt
 * - Cán bộ lớp/BCH: điểm hoàn thành nhiệm vụ + kỹ năng quản lý
 *
 * @throws BadRequestException nếu là cán bộ mà thiếu các trường bắt buộc
 */
export function calculateRoleScore(dto: UpdateRoleScoreDto): number {
  const specialScore = dto.specialAchievementLevel
    ? SPECIAL_ACHIEVEMENT_POINTS[dto.specialAchievementLevel]
    : 0;

  if (dto.studentRoleType === 'NORMAL_STUDENT') {
    return Math.min(10, (dto.normalStudentActivityScore ?? 0) + specialScore);
  }

  const { positionGroup, taskCompletionLevel, managementSkillLevel } = dto;

  if (!positionGroup || !taskCompletionLevel || !managementSkillLevel) {
    throw new BadRequestException(
      'positionGroup, taskCompletionLevel and managementSkillLevel are required for officer roles',
    );
  }

  const taskScore = getOfficerTaskScore(positionGroup, taskCompletionLevel);

  return Math.min(10, taskScore + MANAGEMENT_SKILL_POINTS[managementSkillLevel]);
}

/**
 * Lấy điểm hoàn thành nhiệm vụ cho cán bộ lớp/BCH.
 * - LEADER_GROUP (lớp trưởng, BT chi đoàn…): thang điểm tối đa 7
 * - MEMBER_GROUP (ủy viên BCH, TT/TP lớp…):  thang điểm tối đa 6
 */
function getOfficerTaskScore(
  positionGroup: PositionGroup,
  taskCompletionLevel: TaskCompletionLevel,
): number {
  if (positionGroup === 'LEADER_GROUP') {
    return LEADER_TASK_COMPLETION_POINTS[taskCompletionLevel];
  }

  return MEMBER_TASK_COMPLETION_POINTS[taskCompletionLevel];
}
