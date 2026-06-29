import { Prisma } from '../../../generated/prisma/client';

// ─── Shared base cho section scores ──────────────────────────────────────────
const sectionBase = {
  id: true,
  status: true,
  studentScore: true,
  rank: true,
} satisfies Prisma.EvaluationFormSelect;

// ─── Dùng bởi tất cả update-score methods để fetch current scores ─────────────
export const evaluationAllScoresSelect = {
  id: true,
  status: true,
  studyScore: true,
  disciplineScore: true,
  activityScore: true,
  communityScore: true,
  roleScore: true,
} satisfies Prisma.EvaluationFormSelect;

// ─── GET /me – danh sách phiếu ────────────────────────────────────────────────
export const evaluationListSelect = {
  id: true,
  studentId: true,
  status: true,
  studentScore: true,
  rank: true,
  semester: { select: { year: true, semester: true } },
} satisfies Prisma.EvaluationFormSelect;

// ─── GET /:id – chi tiết phiếu ────────────────────────────────────────────────
export const evaluationDetailSelect = {
  ...evaluationListSelect,
  note: true,
  studyScore: true,
  disciplineScore: true,
  activityScore: true,
  communityScore: true,
  roleScore: true,
  student: { select: { phone: true } },
} satisfies Prisma.EvaluationFormSelect;

// ─── GET /:id/status – approval trail ─────────────────────────────────────────
export const evaluationStatusSelect = {
  id: true,
  status: true,
  submittedAt: true,
  classReviewedAt: true,
  facultyReviewedAt: true,
  adminFinalizedAt: true,
} satisfies Prisma.EvaluationFormSelect;

// ─── GET /:id/summary + POST /:id/submit ──────────────────────────────────────
export const evaluationScoreSummarySelect = {
  ...evaluationStatusSelect,
  studentId: true,
  studentScore: true,
  classScore: true,
  finalScore: true,
  rank: true,
  studyScore: true,
  disciplineScore: true,
  activityScore: true,
  communityScore: true,
  roleScore: true,
  semester: { select: { year: true, semester: true } },
} satisfies Prisma.EvaluationFormSelect;

// ─── Section score selects ────────────────────────────────────────────────────
export const studyScoreSelect = {
  ...sectionBase,
  studyScore: true,
  studyData: true,
} satisfies Prisma.EvaluationFormSelect;

export const disciplineScoreSelect = {
  ...sectionBase,
  disciplineBaseScore: true,
  disciplineScore: true,
  disciplineData: true,
} satisfies Prisma.EvaluationFormSelect;

export const activityScoreSelect = {
  ...sectionBase,
  activityScore: true,
  activityData: true,
} satisfies Prisma.EvaluationFormSelect;

export const communityScoreSelect = {
  ...sectionBase,
  communityScore: true,
  communityData: true,
} satisfies Prisma.EvaluationFormSelect;

export const roleScoreSelect = {
  ...sectionBase,
  roleScore: true,
  roleData: true,
} satisfies Prisma.EvaluationFormSelect;

// ─── Inferred record types ────────────────────────────────────────────────────
export type EvaluationAllScoresRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof evaluationAllScoresSelect;
}>;
export type EvaluationListRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof evaluationListSelect;
}>;
export type EvaluationDetailRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof evaluationDetailSelect;
}>;
export type EvaluationStatusRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof evaluationStatusSelect;
}>;
export type EvaluationScoreSummaryRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof evaluationScoreSummarySelect;
}>;
export type StudyScoreRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof studyScoreSelect;
}>;
export type DisciplineScoreRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof disciplineScoreSelect;
}>;
export type ActivityScoreRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof activityScoreSelect;
}>;
export type CommunityScoreRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof communityScoreSelect;
}>;
export type RoleScoreRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof roleScoreSelect;
}>;
