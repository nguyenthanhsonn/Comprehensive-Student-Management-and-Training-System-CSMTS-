// ─── Semester ─────────────────────────────────────────────────────────────────
export type ApiSemester = 'HK1' | 'HK2' | 'SUMMER';

// ─── Internal ─────────────────────────────────────────────────────────────────
export type ScoreParts = {
  studyScore: number;
  disciplineScore: number;
  activityScore: number;
  communityScore: number;
  roleScore: number;
};

// ─── List & Detail ────────────────────────────────────────────────────────────
export type EvaluationListResponse = {
  id: string;
  studentId: string;
  semester: ApiSemester;
  academicYear: string;
  status: string;
  totalScore: number;
  classification: string | null;
};

export type EvaluationDetailResponse = EvaluationListResponse & {
  phone: string | null;
  note: string | null;
  studyScore: number;
  disciplineScore: number;
  activityScore: number;
  communityScore: number;
  roleScore: number;
};

// ─── Status / review steps ────────────────────────────────────────────────────
export type ReviewStepStatus = 'pending' | 'current' | 'completed' | 'rejected';

export type ReviewStepResponse = {
  key: string;
  label: string;
  status: ReviewStepStatus;
  completedAt: Date | null;
};

export type EvaluationStatusResponse = {
  evaluationId: string;
  status: string;
  statusLabel: string;
  currentStep: string;
  submittedAt: Date | null;
  steps: ReviewStepResponse[];
};

// ─── Score summary ────────────────────────────────────────────────────────────
export type EvaluationScoreSummaryResponse = EvaluationListResponse & {
  statusLabel: string;
  classScore: number | null;
  finalScore: number | null;
  sectionScores: ScoreParts;
  review: EvaluationStatusResponse;
};

// ─── Section: Mục I – Học tập (max 20đ) ──────────────────────────────────────
export type StudyActivityResponse = {
  code: string;
  checked: boolean;
  score: number;
};

export type StudyScoreResponse = {
  evaluationId: string;
  regularScoreLevel: string | null;
  academicRank: string | null;
  activities: StudyActivityResponse[];
  score: number;
  maxScore: 20;
  totalScore: number;
  classification: string | null;
};

// ─── Section: Mục II – Kỷ luật (max 25đ) ────────────────────────────────────
export type DisciplineViolationResponse = {
  code: string;
  count: number;
  deductScore: number;
};

export type DisciplineScoreResponse = {
  evaluationId: string;
  baseScore: number;
  violations: DisciplineViolationResponse[];
  deductedScore: number;
  score: number;
  maxScore: 25;
  totalScore: number;
  classification: string | null;
};

// ─── Section: Mục III – Hoạt động (max 20đ) ──────────────────────────────────
export type ActivityScoreResponse = {
  evaluationId: string;
  politicalActivityLevel: string | null;
  cultureSportLevel: string | null;
  clubActivityLevel: string | null;
  socialPreventionLevel: string | null;
  rewardScore: number;
  score: number;
  maxScore: 20;
  totalScore: number;
  classification: string | null;
};

// ─── Section: Mục IV – Cộng đồng (max 25đ) ───────────────────────────────────
export type CommunityScoreResponse = {
  evaluationId: string;
  lawComplianceLevel: string | null;
  volunteerActivityLevel: string | null;
  communityRelationshipLevel: string | null;
  score: number;
  maxScore: 25;
  totalScore: number;
  classification: string | null;
};

// ─── Section: Mục V – Vai trò BCS/BCH (max 10đ) ─────────────────────────────
export type RoleScoreResponse = {
  evaluationId: string;
  studentRoleType: string | null;
  positionGroup: string | null;
  taskCompletionLevel: string | null;
  managementSkillLevel: string | null;
  normalStudentActivityScore: number | null;
  specialAchievementLevel: string | null;
  score: number;
  maxScore: 10;
  totalScore: number;
  classification: string | null;
};
