import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FormStatus, Prisma, SemesterNo } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  CreateTrainingEvaluationDto,
  type TrainingEvaluationSemester,
} from './dto/create-training-evaluation.dto';
import {
  type ClubActivityLevel,
  type CultureSportLevel,
  type PoliticalActivityLevel,
  type SocialPreventionLevel,
  UpdateActivityScoreDto,
} from './dto/update-activity-score.dto';
import {
  type CommunityRelationshipLevel,
  type LawComplianceLevel,
  UpdateCommunityScoreDto,
  type VolunteerActivityLevel,
} from './dto/update-community-score.dto';
import { UpdateDisciplineScoreDto } from './dto/update-discipline-score.dto';
import {
  type ManagementSkillLevel,
  type PositionGroup,
  type SpecialAchievementLevel,
  type TaskCompletionLevel,
  UpdateRoleScoreDto,
} from './dto/update-role-score.dto';
import {
  type AcademicRank,
  type RegularScoreLevel,
  type StudyActivityCode,
  UpdateStudyScoreDto,
} from './dto/update-study-score.dto';
import { UpdateTrainingEvaluationDraftDto } from './dto/update-training-evaluation-draft.dto';

const trainingEvaluationSummarySelect = {
  id: true,
  studentId: true,
  status: true,
  studentScore: true,
  rank: true,
  semester: {
    select: {
      year: true,
      semester: true,
    },
  },
} satisfies Prisma.EvaluationFormSelect;

const trainingEvaluationDetailSelect = {
  ...trainingEvaluationSummarySelect,
  note: true,
  studyScore: true,
  disciplineScore: true,
  activityScore: true,
  communityScore: true,
  roleScore: true,
  student: {
    select: {
      phone: true,
    },
  },
} satisfies Prisma.EvaluationFormSelect;

const studyScoreSelect = {
  id: true,
  status: true,
  studentScore: true,
  studyScore: true,
  studyData: true,
} satisfies Prisma.EvaluationFormSelect;

const disciplineScoreSelect = {
  id: true,
  status: true,
  studentScore: true,
  disciplineBaseScore: true,
  disciplineScore: true,
  disciplineData: true,
} satisfies Prisma.EvaluationFormSelect;

const activityScoreSelect = {
  id: true,
  status: true,
  studentScore: true,
  activityScore: true,
  activityData: true,
} satisfies Prisma.EvaluationFormSelect;

const communityScoreSelect = {
  id: true,
  status: true,
  studentScore: true,
  communityScore: true,
  communityData: true,
} satisfies Prisma.EvaluationFormSelect;

const roleScoreSelect = {
  id: true,
  status: true,
  studentScore: true,
  roleScore: true,
  roleData: true,
} satisfies Prisma.EvaluationFormSelect;

type TrainingEvaluationSummaryRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof trainingEvaluationSummarySelect;
}>;

type TrainingEvaluationDetailRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof trainingEvaluationDetailSelect;
}>;

type StudyScoreRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof studyScoreSelect;
}>;

type DisciplineScoreRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof disciplineScoreSelect;
}>;

type ActivityScoreRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof activityScoreSelect;
}>;

type CommunityScoreRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof communityScoreSelect;
}>;

type RoleScoreRecord = Prisma.EvaluationFormGetPayload<{
  select: typeof roleScoreSelect;
}>;

type TrainingEvaluationSummaryResponse = {
  id: string;
  studentId: string;
  semester: TrainingEvaluationSemester;
  academicYear: string;
  status: string;
  totalScore: number;
  classification: string | null;
};

type TrainingEvaluationDetailResponse = TrainingEvaluationSummaryResponse & {
  phone: string | null;
  note: string | null;
  studyScore: number;
  disciplineScore: number;
  activityScore: number;
  communityScore: number;
  roleScore: number;
};

type StudyActivityResponse = {
  code: string;
  checked: boolean;
  score: number;
};

type StudyScoreResponse = {
  evaluationId: string;
  regularScoreLevel: string | null;
  academicRank: string | null;
  activities: StudyActivityResponse[];
  score: number;
  maxScore: 20;
  totalScore: number;
};

type DisciplineViolationResponse = {
  code: string;
  count: number;
  deductScore: number;
};

type DisciplineScoreResponse = {
  evaluationId: string;
  baseScore: number;
  violations: DisciplineViolationResponse[];
  deductedScore: number;
  score: number;
  maxScore: 25;
  totalScore: number;
};

type ActivityScoreResponse = {
  evaluationId: string;
  politicalActivityLevel: string | null;
  cultureSportLevel: string | null;
  clubActivityLevel: string | null;
  socialPreventionLevel: string | null;
  rewardScore: number;
  score: number;
  maxScore: 20;
  totalScore: number;
};

type CommunityScoreResponse = {
  evaluationId: string;
  lawComplianceLevel: string | null;
  volunteerActivityLevel: string | null;
  communityRelationshipLevel: string | null;
  score: number;
  maxScore: 25;
  totalScore: number;
};

type RoleScoreResponse = {
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
};

type ScoreParts = {
  studyScore?: number;
  disciplineScore?: number;
  activityScore?: number;
  communityScore?: number;
  roleScore?: number;
};

const REGULAR_SCORE_POINTS: Record<RegularScoreLevel, number> = {
  GTE_9: 6,
  FROM_7_TO_UNDER_9: 5,
  FROM_5_TO_UNDER_7: 4,
  FROM_4_TO_UNDER_5: 2,
  FROM_1_TO_UNDER_4: 1,
};

const STUDY_ACTIVITY_POINTS: Record<StudyActivityCode, number> = {
  ACADEMIC_EVENT_PARTICIPATION: 2,
  SCIENTIFIC_PUBLICATION_OR_CONTEST: 2,
  SCIENTIFIC_AWARD: 2,
};

const ACADEMIC_RANK_POINTS: Record<AcademicRank, number> = {
  EXCELLENT: 8,
  GOOD: 7,
  FAIR: 6,
  AVERAGE: 4,
  WEAK_NO_WARNING: 2,
  WEAK_WARNING_FIRST: 1,
};

const POLITICAL_ACTIVITY_POINTS: Record<PoliticalActivityLevel, number> = {
  GOOD_PARTICIPATION: 5,
  ABSENT_ONCE: 3,
  ABSENT_TWICE: 2,
  ABSENT_MORE_THAN_TWICE_OR_NOT_PARTICIPATED: 0,
};

const CULTURE_SPORT_POINTS: Record<CultureSportLevel, number> = {
  FULL_EFFECTIVE_PARTICIPATION: 5,
  EFFECTIVE_PARTICIPATION_FROM_HALF: 3,
  ENCOURAGED_OTHERS: 2,
  ABSENT_OVER_HALF: 1,
  NOT_PARTICIPATED: 0,
};

const CLUB_ACTIVITY_POINTS: Record<ClubActivityLevel, number> = {
  FULL_EFFECTIVE_PARTICIPATION: 5,
  ACTIVE_ONE_OR_MORE: 3,
  ACTIVE_SUPPORTER: 2,
  ABSENT_OVER_HALF: 1,
  NOT_PARTICIPATED: 0,
};

const SOCIAL_PREVENTION_POINTS: Record<SocialPreventionLevel, number> = {
  MULTIPLE_ACTIVITIES_OR_REPORTING: 3,
  ONE_EFFECTIVE_ACTIVITY: 2,
  AWARENESS_OR_SUPPORT: 1,
  REMINDED_VIOLATION: 0,
};

const LAW_COMPLIANCE_POINTS: Record<LawComplianceLevel, number> = {
  GOOD_WITH_REWARD: 10,
  GOOD: 8,
  AVERAGE: 5,
  VIOLATED: 0,
};

const VOLUNTEER_ACTIVITY_POINTS: Record<VolunteerActivityLevel, number> = {
  ACTIVE_WITH_REWARD: 10,
  ACTIVE: 8,
  PARTICIPATED: 5,
  NOT_PARTICIPATED: 0,
};

const COMMUNITY_RELATIONSHIP_POINTS: Record<
  CommunityRelationshipLevel,
  number
> = {
  GOOD: 5,
  AVERAGE: 3,
  BAD: 0,
};

const LEADER_TASK_COMPLETION_POINTS: Record<TaskCompletionLevel, number> = {
  EXCELLENT: 7,
  GOOD: 6,
  COMPLETED: 4,
  POOR: 0,
};

const MEMBER_TASK_COMPLETION_POINTS: Record<TaskCompletionLevel, number> = {
  EXCELLENT: 6,
  GOOD: 5,
  COMPLETED: 3,
  POOR: 0,
};

const MANAGEMENT_SKILL_POINTS: Record<ManagementSkillLevel, number> = {
  HEAD_POSITION: 3,
  DEPUTY_POSITION: 2,
  MEMBER_POSITION: 1,
};

const SPECIAL_ACHIEVEMENT_POINTS: Record<SpecialAchievementLevel, number> = {
  SCHOOL_LEVEL_OR_HIGHER: 7,
  FACULTY_LEVEL: 5,
  NONE: 0,
};

@Injectable()
export class TrainingEvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateTrainingEvaluationDto,
  ): Promise<TrainingEvaluationSummaryResponse> {
    const academicYearStart = this.parseAcademicYearStart(dto.academicYear);
    const semesterNo = this.toSemesterNo(dto.semester);

    const [semester, currentClass] = await Promise.all([
      this.prisma.semester.findUnique({
        where: {
          year_semester: {
            year: academicYearStart,
            semester: semesterNo,
          },
        },
        select: { id: true },
      }),
      this.prisma.classStudent.findFirst({
        where: { studentId: user.id },
        orderBy: { enrolledAt: 'desc' },
        select: { classId: true },
      }),
    ]);

    if (!semester) {
      throw new NotFoundException(
        'Semester metadata was not found for the requested academic year',
      );
    }

    if (!currentClass) {
      throw new BadRequestException(
        'Student must belong to a class before creating an evaluation form',
      );
    }

    try {
      const evaluation = await this.prisma.evaluationForm.create({
        data: {
          studentId: user.id,
          classId: currentClass.classId,
          semesterId: semester.id,
          status: FormStatus.draft,
          studentScore: 0,
        },
        select: trainingEvaluationSummarySelect,
      });

      return this.toSummaryResponse(evaluation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Training evaluation already exists for this semester and academic year',
        );
      }

      throw error;
    }
  }

  async findMine(
    user: AuthenticatedUser,
  ): Promise<TrainingEvaluationSummaryResponse[]> {
    const evaluations = await this.prisma.evaluationForm.findMany({
      where: { studentId: user.id },
      select: trainingEvaluationSummarySelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return evaluations.map((evaluation) => this.toSummaryResponse(evaluation));
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<TrainingEvaluationDetailResponse> {
    const evaluation = await this.prisma.evaluationForm.findFirst({
      where: { id, studentId: user.id },
      select: trainingEvaluationDetailSelect,
    });

    if (!evaluation) {
      throw new NotFoundException('Training evaluation was not found');
    }

    return this.toDetailResponse(evaluation);
  }

  async updateDraft(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateTrainingEvaluationDraftDto,
  ): Promise<TrainingEvaluationDetailResponse> {
    const hasPhone = Object.prototype.hasOwnProperty.call(dto, 'phone');
    const hasNote = Object.prototype.hasOwnProperty.call(dto, 'note');

    if (!hasPhone && !hasNote) {
      throw new BadRequestException('No draft information provided');
    }

    const evaluation = await this.findOwnedEvaluationForWrite(user, id);
    this.assertEditable(evaluation.status);

    await this.prisma.$transaction(async (transaction) => {
      if (hasPhone) {
        await transaction.user.update({
          where: { id: user.id },
          data: { phone: dto.phone ?? null },
          select: { id: true },
        });
      }

      if (hasNote) {
        await transaction.evaluationForm.update({
          where: { id },
          data: { note: dto.note ?? null },
          select: { id: true },
        });
      }
    });

    return this.findOne(user, id);
  }

  async getStudyScore(
    user: AuthenticatedUser,
    id: string,
  ): Promise<StudyScoreResponse> {
    const evaluation = await this.findOwnedStudyScore(user, id);
    return this.toStudyScoreResponse(evaluation);
  }

  async updateStudyScore(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateStudyScoreDto,
  ): Promise<StudyScoreResponse> {
    const current = await this.findOwnedEvaluationForWrite(user, id, {
      disciplineScore: true,
      activityScore: true,
      communityScore: true,
      roleScore: true,
    });
    this.assertEditable(current.status);

    const activities = dto.activities.map((activity) => ({
      code: activity.code,
      checked: activity.checked,
      score: STUDY_ACTIVITY_POINTS[activity.code],
    }));
    const activityScore = activities.reduce(
      (total, activity) => total + (activity.checked ? activity.score : 0),
      0,
    );
    const score =
      REGULAR_SCORE_POINTS[dto.regularScoreLevel] +
      activityScore +
      ACADEMIC_RANK_POINTS[dto.academicRank];

    const studyData = {
      regularScoreLevel: dto.regularScoreLevel,
      academicRank: dto.academicRank,
      activities,
    };
    const totalScore = this.calculateTotalScore({
      studyScore: score,
      disciplineScore: current.disciplineScore,
      activityScore: current.activityScore,
      communityScore: current.communityScore,
      roleScore: current.roleScore,
    });

    const updated = await this.prisma.evaluationForm.update({
      where: { id },
      data: { studyScore: score, studyData, studentScore: totalScore },
      select: studyScoreSelect,
    });

    return this.toStudyScoreResponse(updated);
  }

  async getDisciplineScore(
    user: AuthenticatedUser,
    id: string,
  ): Promise<DisciplineScoreResponse> {
    const evaluation = await this.findOwnedDisciplineScore(user, id);
    return this.toDisciplineScoreResponse(evaluation);
  }

  async updateDisciplineScore(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateDisciplineScoreDto,
  ): Promise<DisciplineScoreResponse> {
    const current = await this.findOwnedEvaluationForWrite(user, id, {
      studyScore: true,
      activityScore: true,
      communityScore: true,
      roleScore: true,
    });
    this.assertEditable(current.status);

    const violations = dto.violations.map((violation) => ({
      code: violation.code,
      count: violation.count,
      deductScore: violation.deductScore,
    }));
    const deductedScore = violations.reduce(
      (total, violation) => total + violation.count * violation.deductScore,
      0,
    );
    const score = Math.max(0, dto.baseScore - deductedScore);
    const disciplineData = { baseScore: dto.baseScore, violations };
    const totalScore = this.calculateTotalScore({
      studyScore: current.studyScore,
      disciplineScore: score,
      activityScore: current.activityScore,
      communityScore: current.communityScore,
      roleScore: current.roleScore,
    });

    const updated = await this.prisma.evaluationForm.update({
      where: { id },
      data: {
        disciplineBaseScore: dto.baseScore,
        disciplineScore: score,
        disciplineData,
        studentScore: totalScore,
      },
      select: disciplineScoreSelect,
    });

    return this.toDisciplineScoreResponse(updated);
  }

  async getActivityScore(
    user: AuthenticatedUser,
    id: string,
  ): Promise<ActivityScoreResponse> {
    const evaluation = await this.findOwnedActivityScore(user, id);
    return this.toActivityScoreResponse(evaluation);
  }

  async updateActivityScore(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateActivityScoreDto,
  ): Promise<ActivityScoreResponse> {
    const current = await this.findOwnedEvaluationForWrite(user, id, {
      studyScore: true,
      disciplineScore: true,
      communityScore: true,
      roleScore: true,
    });
    this.assertEditable(current.status);

    const score = Math.min(
      20,
      POLITICAL_ACTIVITY_POINTS[dto.politicalActivityLevel] +
        CULTURE_SPORT_POINTS[dto.cultureSportLevel] +
        CLUB_ACTIVITY_POINTS[dto.clubActivityLevel] +
        SOCIAL_PREVENTION_POINTS[dto.socialPreventionLevel] +
        dto.rewardScore,
    );
    const activityData = {
      politicalActivityLevel: dto.politicalActivityLevel,
      cultureSportLevel: dto.cultureSportLevel,
      clubActivityLevel: dto.clubActivityLevel,
      socialPreventionLevel: dto.socialPreventionLevel,
      rewardScore: dto.rewardScore,
    };
    const totalScore = this.calculateTotalScore({
      studyScore: current.studyScore,
      disciplineScore: current.disciplineScore,
      activityScore: score,
      communityScore: current.communityScore,
      roleScore: current.roleScore,
    });

    const updated = await this.prisma.evaluationForm.update({
      where: { id },
      data: { activityScore: score, activityData, studentScore: totalScore },
      select: activityScoreSelect,
    });

    return this.toActivityScoreResponse(updated);
  }

  async getCommunityScore(
    user: AuthenticatedUser,
    id: string,
  ): Promise<CommunityScoreResponse> {
    const evaluation = await this.findOwnedCommunityScore(user, id);
    return this.toCommunityScoreResponse(evaluation);
  }

  async updateCommunityScore(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateCommunityScoreDto,
  ): Promise<CommunityScoreResponse> {
    const current = await this.findOwnedEvaluationForWrite(user, id, {
      studyScore: true,
      disciplineScore: true,
      activityScore: true,
      roleScore: true,
    });
    this.assertEditable(current.status);

    const score = Math.min(
      25,
      LAW_COMPLIANCE_POINTS[dto.lawComplianceLevel] +
        VOLUNTEER_ACTIVITY_POINTS[dto.volunteerActivityLevel] +
        COMMUNITY_RELATIONSHIP_POINTS[dto.communityRelationshipLevel],
    );
    const communityData = {
      lawComplianceLevel: dto.lawComplianceLevel,
      volunteerActivityLevel: dto.volunteerActivityLevel,
      communityRelationshipLevel: dto.communityRelationshipLevel,
    };
    const totalScore = this.calculateTotalScore({
      studyScore: current.studyScore,
      disciplineScore: current.disciplineScore,
      activityScore: current.activityScore,
      communityScore: score,
      roleScore: current.roleScore,
    });

    const updated = await this.prisma.evaluationForm.update({
      where: { id },
      data: {
        communityScore: score,
        communityData,
        studentScore: totalScore,
      },
      select: communityScoreSelect,
    });

    return this.toCommunityScoreResponse(updated);
  }

  async getRoleScore(
    user: AuthenticatedUser,
    id: string,
  ): Promise<RoleScoreResponse> {
    const evaluation = await this.findOwnedRoleScore(user, id);
    return this.toRoleScoreResponse(evaluation);
  }

  async updateRoleScore(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateRoleScoreDto,
  ): Promise<RoleScoreResponse> {
    const current = await this.findOwnedEvaluationForWrite(user, id, {
      studyScore: true,
      disciplineScore: true,
      activityScore: true,
      communityScore: true,
    });
    this.assertEditable(current.status);

    const score = this.calculateRoleScore(dto);
    const roleData = {
      studentRoleType: dto.studentRoleType,
      positionGroup: dto.positionGroup ?? null,
      taskCompletionLevel: dto.taskCompletionLevel ?? null,
      managementSkillLevel: dto.managementSkillLevel ?? null,
      normalStudentActivityScore: dto.normalStudentActivityScore ?? null,
      specialAchievementLevel: dto.specialAchievementLevel ?? null,
    };
    const totalScore = this.calculateTotalScore({
      studyScore: current.studyScore,
      disciplineScore: current.disciplineScore,
      activityScore: current.activityScore,
      communityScore: current.communityScore,
      roleScore: score,
    });

    const updated = await this.prisma.evaluationForm.update({
      where: { id },
      data: { roleScore: score, roleData, studentScore: totalScore },
      select: roleScoreSelect,
    });

    return this.toRoleScoreResponse(updated);
  }

  private async findOwnedEvaluationForWrite<
    TSelect extends Prisma.EvaluationFormSelect = Record<never, never>,
  >(user: AuthenticatedUser, id: string, select?: TSelect) {
    const evaluation = await this.prisma.evaluationForm.findFirst({
      where: { id, studentId: user.id },
      select: { id: true, status: true, ...select },
    });

    if (!evaluation) {
      throw new NotFoundException('Training evaluation was not found');
    }

    return evaluation;
  }

  private async findOwnedStudyScore(
    user: AuthenticatedUser,
    id: string,
  ): Promise<StudyScoreRecord> {
    const evaluation = await this.prisma.evaluationForm.findFirst({
      where: { id, studentId: user.id },
      select: studyScoreSelect,
    });

    if (!evaluation) {
      throw new NotFoundException('Training evaluation was not found');
    }

    return evaluation;
  }

  private async findOwnedDisciplineScore(
    user: AuthenticatedUser,
    id: string,
  ): Promise<DisciplineScoreRecord> {
    const evaluation = await this.prisma.evaluationForm.findFirst({
      where: { id, studentId: user.id },
      select: disciplineScoreSelect,
    });

    if (!evaluation) {
      throw new NotFoundException('Training evaluation was not found');
    }

    return evaluation;
  }

  private async findOwnedActivityScore(
    user: AuthenticatedUser,
    id: string,
  ): Promise<ActivityScoreRecord> {
    const evaluation = await this.prisma.evaluationForm.findFirst({
      where: { id, studentId: user.id },
      select: activityScoreSelect,
    });

    if (!evaluation) {
      throw new NotFoundException('Training evaluation was not found');
    }

    return evaluation;
  }

  private async findOwnedCommunityScore(
    user: AuthenticatedUser,
    id: string,
  ): Promise<CommunityScoreRecord> {
    const evaluation = await this.prisma.evaluationForm.findFirst({
      where: { id, studentId: user.id },
      select: communityScoreSelect,
    });

    if (!evaluation) {
      throw new NotFoundException('Training evaluation was not found');
    }

    return evaluation;
  }

  private async findOwnedRoleScore(
    user: AuthenticatedUser,
    id: string,
  ): Promise<RoleScoreRecord> {
    const evaluation = await this.prisma.evaluationForm.findFirst({
      where: { id, studentId: user.id },
      select: roleScoreSelect,
    });

    if (!evaluation) {
      throw new NotFoundException('Training evaluation was not found');
    }

    return evaluation;
  }

  private assertEditable(status: FormStatus) {
    const editableStatuses: FormStatus[] = [
      FormStatus.draft,
      FormStatus.rejected,
    ];

    if (!editableStatuses.includes(status)) {
      throw new ConflictException('Only draft evaluations can be updated');
    }
  }

  private calculateTotalScore(scores: ScoreParts): number {
    return Math.min(
      100,
      (scores.studyScore ?? 0) +
        (scores.disciplineScore ?? 0) +
        (scores.activityScore ?? 0) +
        (scores.communityScore ?? 0) +
        (scores.roleScore ?? 0),
    );
  }

  private calculateRoleScore(dto: UpdateRoleScoreDto): number {
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

    const taskScore = this.getOfficerTaskScore(
      positionGroup,
      taskCompletionLevel,
    );

    return Math.min(
      10,
      taskScore + MANAGEMENT_SKILL_POINTS[managementSkillLevel],
    );
  }

  private getOfficerTaskScore(
    positionGroup: PositionGroup,
    taskCompletionLevel: TaskCompletionLevel,
  ): number {
    if (positionGroup === 'LEADER_GROUP') {
      return LEADER_TASK_COMPLETION_POINTS[taskCompletionLevel];
    }

    return MEMBER_TASK_COMPLETION_POINTS[taskCompletionLevel];
  }

  private parseAcademicYearStart(academicYear: string): number {
    const [startYearText, endYearText] = academicYear.split('-');
    const startYear = Number(startYearText);
    const endYear = Number(endYearText);

    if (!Number.isInteger(startYear) || endYear !== startYear + 1) {
      throw new BadRequestException(
        'academicYear must be a continuous range, for example 2025-2026',
      );
    }

    return startYear;
  }

  private toSemesterNo(semester: TrainingEvaluationSemester): SemesterNo {
    const semesterMap: Record<TrainingEvaluationSemester, SemesterNo> = {
      HK1: SemesterNo.SEMESTER_1,
      HK2: SemesterNo.SEMESTER_2,
      SUMMER: SemesterNo.summer,
    };

    return semesterMap[semester];
  }

  private toSummaryResponse(
    evaluation: TrainingEvaluationSummaryRecord,
  ): TrainingEvaluationSummaryResponse {
    return {
      id: evaluation.id,
      studentId: evaluation.studentId,
      semester: this.toApiSemester(evaluation.semester.semester),
      academicYear: this.toAcademicYear(evaluation.semester.year),
      status: evaluation.status.toUpperCase(),
      totalScore: evaluation.studentScore ?? 0,
      classification: evaluation.rank?.toUpperCase() ?? null,
    };
  }

  private toDetailResponse(
    evaluation: TrainingEvaluationDetailRecord,
  ): TrainingEvaluationDetailResponse {
    return {
      ...this.toSummaryResponse(evaluation),
      phone: evaluation.student.phone,
      note: evaluation.note,
      studyScore: evaluation.studyScore,
      disciplineScore: evaluation.disciplineScore,
      activityScore: evaluation.activityScore,
      communityScore: evaluation.communityScore,
      roleScore: evaluation.roleScore,
    };
  }

  private toStudyScoreResponse(
    evaluation: StudyScoreRecord,
  ): StudyScoreResponse {
    const data = this.readJsonObject(evaluation.studyData);
    const activities = this.readStudyActivities(data.activities);

    return {
      evaluationId: evaluation.id,
      regularScoreLevel: this.readNullableString(data.regularScoreLevel),
      academicRank: this.readNullableString(data.academicRank),
      activities,
      score: evaluation.studyScore,
      maxScore: 20,
      totalScore: evaluation.studentScore ?? 0,
    };
  }

  private toDisciplineScoreResponse(
    evaluation: DisciplineScoreRecord,
  ): DisciplineScoreResponse {
    const data = this.readJsonObject(evaluation.disciplineData);
    const violations = this.readDisciplineViolations(data.violations);
    const deductedScore = violations.reduce(
      (total, violation) => total + violation.count * violation.deductScore,
      0,
    );

    return {
      evaluationId: evaluation.id,
      baseScore: evaluation.disciplineBaseScore,
      violations,
      deductedScore,
      score: evaluation.disciplineScore,
      maxScore: 25,
      totalScore: evaluation.studentScore ?? 0,
    };
  }

  private toActivityScoreResponse(
    evaluation: ActivityScoreRecord,
  ): ActivityScoreResponse {
    const data = this.readJsonObject(evaluation.activityData);

    return {
      evaluationId: evaluation.id,
      politicalActivityLevel: this.readNullableString(
        data.politicalActivityLevel,
      ),
      cultureSportLevel: this.readNullableString(data.cultureSportLevel),
      clubActivityLevel: this.readNullableString(data.clubActivityLevel),
      socialPreventionLevel: this.readNullableString(
        data.socialPreventionLevel,
      ),
      rewardScore: this.readNumber(data.rewardScore) ?? 0,
      score: evaluation.activityScore,
      maxScore: 20,
      totalScore: evaluation.studentScore ?? 0,
    };
  }

  private toCommunityScoreResponse(
    evaluation: CommunityScoreRecord,
  ): CommunityScoreResponse {
    const data = this.readJsonObject(evaluation.communityData);

    return {
      evaluationId: evaluation.id,
      lawComplianceLevel: this.readNullableString(data.lawComplianceLevel),
      volunteerActivityLevel: this.readNullableString(
        data.volunteerActivityLevel,
      ),
      communityRelationshipLevel: this.readNullableString(
        data.communityRelationshipLevel,
      ),
      score: evaluation.communityScore,
      maxScore: 25,
      totalScore: evaluation.studentScore ?? 0,
    };
  }

  private toRoleScoreResponse(evaluation: RoleScoreRecord): RoleScoreResponse {
    const data = this.readJsonObject(evaluation.roleData);

    return {
      evaluationId: evaluation.id,
      studentRoleType: this.readNullableString(data.studentRoleType),
      positionGroup: this.readNullableString(data.positionGroup),
      taskCompletionLevel: this.readNullableString(data.taskCompletionLevel),
      managementSkillLevel: this.readNullableString(data.managementSkillLevel),
      normalStudentActivityScore: this.readNumber(
        data.normalStudentActivityScore,
      ),
      specialAchievementLevel: this.readNullableString(
        data.specialAchievementLevel,
      ),
      score: evaluation.roleScore,
      maxScore: 10,
      totalScore: evaluation.studentScore ?? 0,
    };
  }

  private readJsonObject(value: Prisma.JsonValue): Prisma.JsonObject {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value;
  }

  private readNullableString(
    value: Prisma.JsonValue | undefined,
  ): string | null {
    return typeof value === 'string' ? value : null;
  }

  private readNumber(value: Prisma.JsonValue | undefined): number | null {
    return typeof value === 'number' ? value : null;
  }

  private readStudyActivities(
    value: Prisma.JsonValue | undefined,
  ): StudyActivityResponse[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return [];
      }

      const record = item as Record<string, Prisma.JsonValue>;
      if (
        typeof record.code !== 'string' ||
        typeof record.checked !== 'boolean' ||
        typeof record.score !== 'number'
      ) {
        return [];
      }

      return [
        {
          code: record.code,
          checked: record.checked,
          score: record.score,
        },
      ];
    });
  }

  private readDisciplineViolations(
    value: Prisma.JsonValue | undefined,
  ): DisciplineViolationResponse[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return [];
      }

      const record = item as Record<string, Prisma.JsonValue>;
      if (
        typeof record.code !== 'string' ||
        typeof record.count !== 'number' ||
        typeof record.deductScore !== 'number'
      ) {
        return [];
      }

      return [
        {
          code: record.code,
          count: record.count,
          deductScore: record.deductScore,
        },
      ];
    });
  }

  private toApiSemester(semester: SemesterNo): TrainingEvaluationSemester {
    const semesterMap: Record<SemesterNo, TrainingEvaluationSemester> = {
      [SemesterNo.SEMESTER_1]: 'HK1',
      [SemesterNo.SEMESTER_2]: 'HK2',
      [SemesterNo.summer]: 'SUMMER',
    };

    return semesterMap[semester];
  }

  private toAcademicYear(startYear: number): string {
    return `${startYear}-${startYear + 1}`;
  }
}
