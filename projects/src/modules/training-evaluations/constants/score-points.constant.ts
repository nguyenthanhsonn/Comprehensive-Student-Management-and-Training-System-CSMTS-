import type { EvalRank } from '../../../generated/prisma/client';
import type { AcademicRank, RegularScoreLevel, StudyActivityCode } from '../dto/update-study-score.dto';
import type { ClubActivityLevel, CultureSportLevel, PoliticalActivityLevel, SocialPreventionLevel } from '../dto/update-activity-score.dto';
import type { CommunityRelationshipLevel, LawComplianceLevel, VolunteerActivityLevel } from '../dto/update-community-score.dto';
import type { ManagementSkillLevel, SpecialAchievementLevel, TaskCompletionLevel } from '../dto/update-role-score.dto';

// ─── Mục I – Ý thức học tập (max 20đ) ────────────────────────────────────────

// Tiêu chí 1: Điểm TB đánh giá thường xuyên (max 6đ)
export const REGULAR_SCORE_POINTS: Record<RegularScoreLevel, number> = {
  GTE_9: 6,
  FROM_7_TO_UNDER_9: 5,
  FROM_5_TO_UNDER_7: 4,
  FROM_4_TO_UNDER_5: 2,
  FROM_1_TO_UNDER_4: 1,
};

// Tiêu chí 2: Hoạt động học thuật/NCKH/thi Olympic (max 6đ, cộng dồn)
export const STUDY_ACTIVITY_POINTS: Record<StudyActivityCode, number> = {
  ACADEMIC_EVENT_PARTICIPATION: 2,
  SCIENTIFIC_PUBLICATION_OR_CONTEST: 2,
  SCIENTIFIC_AWARD: 2,
};

// Tiêu chí 3: Xếp loại học tập TBCHT (max 8đ)
export const ACADEMIC_RANK_POINTS: Record<AcademicRank, number> = {
  EXCELLENT: 8,
  GOOD: 7,
  FAIR: 6,
  AVERAGE: 4,
  WEAK_NO_WARNING: 2,
  WEAK_WARNING_FIRST: 1,
};

// ─── Mục III – Hoạt động chính trị, xã hội, VH, thể thao (max 20đ) ──────────

// Tiêu chí 1: Hoạt động chính trị, xã hội (max 5đ)
export const POLITICAL_ACTIVITY_POINTS: Record<PoliticalActivityLevel, number> = {
  GOOD_PARTICIPATION: 5,
  ABSENT_ONCE: 3,
  ABSENT_TWICE: 2,
  ABSENT_MORE_THAN_TWICE_OR_NOT_PARTICIPATED: 0,
};

// Tiêu chí 2: Văn hóa, văn nghệ, thể thao (max 5đ)
export const CULTURE_SPORT_POINTS: Record<CultureSportLevel, number> = {
  FULL_EFFECTIVE_PARTICIPATION: 5,
  EFFECTIVE_PARTICIPATION_FROM_HALF: 3,
  ENCOURAGED_OTHERS: 2,
  ABSENT_OVER_HALF: 1,
  NOT_PARTICIPATED: 0,
};

// Tiêu chí 3: Câu lạc bộ, Đội, Nhóm (max 5đ)
export const CLUB_ACTIVITY_POINTS: Record<ClubActivityLevel, number> = {
  FULL_EFFECTIVE_PARTICIPATION: 5,
  ACTIVE_ONE_OR_MORE: 3,
  ACTIVE_SUPPORTER: 2,
  ABSENT_OVER_HALF: 1,
  NOT_PARTICIPATED: 0,
};

// Tiêu chí 4: Phòng chống TNXH (max 3đ)
export const SOCIAL_PREVENTION_POINTS: Record<SocialPreventionLevel, number> = {
  MULTIPLE_ACTIVITIES_OR_REPORTING: 3,
  ONE_EFFECTIVE_ACTIVITY: 2,
  AWARENESS_OR_SUPPORT: 1,
  REMINDED_VIOLATION: 0,
};

// Tiêu chí 5: Khen thưởng trong mục III (max 2đ) – client tự nhập, validated bởi @Max(2) trong DTO

// ─── Mục IV – Ý thức công dân trong quan hệ cộng đồng (max 25đ) ──────────────

// Tiêu chí 1: Chấp hành pháp luật, tuyên truyền (max 10đ)
export const LAW_COMPLIANCE_POINTS: Record<LawComplianceLevel, number> = {
  GOOD_WITH_REWARD: 10,
  GOOD: 8,
  AVERAGE: 5,
  VIOLATED: 0,
};

// Tiêu chí 2: Hoạt động nhân đạo, từ thiện, tình nguyện (max 10đ)
export const VOLUNTEER_ACTIVITY_POINTS: Record<VolunteerActivityLevel, number> = {
  ACTIVE_WITH_REWARD: 10,
  ACTIVE: 8,
  PARTICIPATED: 5,
  NOT_PARTICIPATED: 0,
};

// Tiêu chí 3: Xây dựng đoàn kết, bảo vệ cảnh quan (max 5đ)
// GOOD=5, ONE_WARNING=1đ (bị nhắc 1 lần), TWO_WARNINGS=0đ (bị nhắc 2 lần)
export const COMMUNITY_RELATIONSHIP_POINTS: Record<CommunityRelationshipLevel, number> = {
  GOOD: 5,
  ONE_WARNING: 1,
  TWO_WARNINGS: 0,
};

// ─── Mục V – Vai trò BCS lớp / BCH tổ chức (max 10đ) ────────────────────────

// Nhánh 1 – Cán bộ: tiêu chí a1 (lớp trưởng, BT chi đoàn...) max 7đ
export const LEADER_TASK_COMPLETION_POINTS: Record<TaskCompletionLevel, number> = {
  EXCELLENT: 7,
  GOOD: 6,
  COMPLETED: 4,
  POOR: 0,
};

// Nhánh 1 – Cán bộ: tiêu chí a2 (ủy viên BCH, TT/TP lớp...) max 6đ
export const MEMBER_TASK_COMPLETION_POINTS: Record<TaskCompletionLevel, number> = {
  EXCELLENT: 6,
  GOOD: 5,
  COMPLETED: 3,
  POOR: 0,
};

// Nhánh 1 – Cán bộ: tiêu chí b – kỹ năng quản lý (max 3đ)
export const MANAGEMENT_SKILL_POINTS: Record<ManagementSkillLevel, number> = {
  HEAD_POSITION: 3,
  DEPUTY_POSITION: 2,
  MEMBER_POSITION: 1,
};

// Nhánh 2 – Sinh viên thường: tiêu chí b – thành tích đặc biệt
export const SPECIAL_ACHIEVEMENT_POINTS: Record<SpecialAchievementLevel, number> = {
  SCHOOL_LEVEL_OR_HIGHER: 7,
  FACULTY_LEVEL: 5,
  NONE: 0,
};

// ─── Phân loại kết quả rèn luyện ─────────────────────────────────────────────
export const CLASSIFICATION_LABELS: Record<EvalRank, string> = {
  excellent: 'Xuất sắc',
  good: 'Tốt',
  fair: 'Khá',
  average: 'Trung bình',
  weak: 'Yếu',
  poor: 'Kém',
};
