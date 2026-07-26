import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FormStatus, Prisma } from '../../generated/prisma/client';
import { UserRole, type PaginatedResult } from 'src/common/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  mapToNotificationResponse,
  NotificationsService,
} from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { notificationSelect } from '../notifications/selects/notification.select';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AdminListEvaluationsQueryDto } from './dto/admin-list-evaluations-query.dto';
import { CreateTrainingEvaluationDto } from './dto/create-training-evaluation.dto';
import { ReviewTrainingEvaluationDto } from './dto/review-training-evaluation.dto';
import { ReviewScoresDto } from './dto/review-scores.dto';
import { UpdateActivityScoreDto } from './dto/update-activity-score.dto';
import { UpdateCommunityScoreDto } from './dto/update-community-score.dto';
import { UpdateDisciplineScoreDto } from './dto/update-discipline-score.dto';
import { UpdateRoleScoreDto } from './dto/update-role-score.dto';
import { UpdateStudyScoreDto } from './dto/update-study-score.dto';
import { UpdateTrainingEvaluationDraftDto } from './dto/update-training-evaluation-draft.dto';
import {
  ACADEMIC_RANK_POINTS,
  CLUB_ACTIVITY_POINTS,
  COMMUNITY_RELATIONSHIP_POINTS,
  CULTURE_SPORT_POINTS,
  LAW_COMPLIANCE_POINTS,
  POLITICAL_ACTIVITY_POINTS,
  REGULAR_SCORE_POINTS,
  SOCIAL_PREVENTION_POINTS,
  STUDY_ACTIVITY_POINTS,
  VOLUNTEER_ACTIVITY_POINTS,
} from './constants/score-points.constant';
import {
  mapToActivityScoreResponse,
  mapToCommunityScoreResponse,
  mapToDisciplineScoreResponse,
  mapToListResponse,
  mapToDetailResponse,
  mapToAdminListItem,
  mapToRoleScoreResponse,
  mapToScoreSummaryResponse,
  mapToStatusResponse,
  mapToStudyScoreResponse,
} from './helpers/evaluation.mapper';
import {
  assertEditable,
  assertNotLocked,
  calculateClassification,
  calculateRoleScore,
  calculateScoreResult,
} from './helpers/score.calculator';
import { resolveReviewStage } from './helpers/review-workflow.helper';
import {
  parseAcademicYearStart,
  resolveSemesterId,
  toSemesterNo,
} from './helpers/semester.helper';
import {
  activityScoreSelect,
  communityScoreSelect,
  disciplineScoreSelect,
  evaluationDetailSelect,
  evaluationAdminListSelect,
  evaluationListSelect,
  evaluationScoreSummarySelect,
  evaluationStatusSelect,
  roleScoreSelect,
  studyScoreSelect,
  type EvaluationDetailRecord,
  type EvaluationAdminListRecord,
  type EvaluationScoreSummaryRecord,
  type EvaluationStatusRecord,
} from './selects/evaluation-form.select';
import type {
  ActivityScoreResponse,
  CommunityScoreResponse,
  DisciplineScoreResponse,
  EvaluationDetailResponse,
  EvaluationAdminListItem,
  EvaluationListResponse,
  EvaluationScoreSummaryResponse,
  EvaluationStatusResponse,
  RoleScoreResponse,
  StudyScoreResponse,
} from './types/evaluation-form.types';

@Injectable()
export class TrainingEvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Quản lý phiếu (CRUD + lifecycle) ────────────────────────────────────────

  /**
   * Tạo phiếu đánh giá mới cho học kỳ/năm học được chỉ định.
   * Sinh viên phải thuộc ít nhất một lớp học và học kỳ phải tồn tại trong hệ thống.
   * Mỗi sinh viên chỉ được có tối đa 1 phiếu mỗi học kỳ (unique constraint).
   */
  async create(
    userId: string,
    dto: CreateTrainingEvaluationDto,
  ): Promise<EvaluationListResponse> {
    const academicYearStart = parseAcademicYearStart(dto.academicYear);
    const semesterNo = toSemesterNo(dto.semester);

    const [semester, currentClass] = await Promise.all([
      this.prisma.semester.findUnique({
        where: {
          year_semester: { year: academicYearStart, semester: semesterNo },
        },
        select: { id: true },
      }),
      this.prisma.classStudent.findFirst({
        where: { studentId: userId },
        orderBy: { enrolledAt: 'desc' },
        select: { classId: true },
      }),
    ]);

    if (!semester) {
      throw new NotFoundException(
        'Không tìm thấy thông tin học kỳ cho năm học được yêu cầu',
      );
    }

    if (!currentClass) {
      throw new BadRequestException(
        'Sinh viên phải thuộc một lớp học trước khi tạo phiếu đánh giá',
      );
    }

    try {
      const evaluation = await this.prisma.evaluationForm.create({
        data: {
          studentId: userId,
          classId: currentClass.classId,
          semesterId: semester.id,
          status: FormStatus.draft,
          studentScore: 0,
        },
        select: evaluationListSelect,
      });

      return mapToListResponse(evaluation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Phiếu đánh giá đã tồn tại cho học kỳ và năm học này',
        );
      }
      throw error;
    }
  }

  // TODO: Đo lại relationLoadStrategy 'join' vs 'query' khi có dữ liệu
  // production-like (vài trăm+ evaluation_forms). Hiện tại (2026-07) DB test
  // chỉ có 4 rows, không đủ để kết luận join có gây phình payload không do
  // quan hệ class.major.faculty có thể 1-nhiều. Xem báo cáo đo lường ngày 18/07/2026.
  async findAll(
    user: AuthenticatedUser,
    query: AdminListEvaluationsQueryDto,
  ): Promise<PaginatedResult<EvaluationAdminListItem>> {
    await this.assertCanListEvaluations(user, query.classId);

    const semesterId = await resolveSemesterId(
      this.prisma,
      query.semester,
      query.academicYear,
    );

    const where: Prisma.EvaluationFormWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.classId && { classId: query.classId }),
      ...(query.facultyId && {
        class: { major: { facultyId: query.facultyId } },
      }),
      ...(semesterId && { semesterId }),
      ...(query.keyword && {
        student: {
          OR: [
            { fullName: { contains: query.keyword, mode: 'insensitive' } },
            { email: { contains: query.keyword, mode: 'insensitive' } },
          ],
        },
      }),
    };

    const [evaluations, total] = await Promise.all([
      this.prisma.evaluationForm.findMany({
        where,
        select: evaluationAdminListSelect,
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.evaluationForm.count({ where }),
    ]);

    return {
      items: evaluations.map((evaluation: EvaluationAdminListRecord) =>
        mapToAdminListItem(evaluation),
      ),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * Lấy danh sách tất cả phiếu của sinh viên đang đăng nhập,
   * sắp xếp mới nhất lên đầu.
   */
  async findMine(userId: string): Promise<EvaluationListResponse[]> {
    const evaluations = await this.prisma.evaluationForm.findMany({
      // Small per-student list with one many-to-one relation; measured lower latency and unchanged payload.
      relationLoadStrategy: 'join',
      where: { studentId: userId },
      select: evaluationListSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return evaluations.map(mapToListResponse);
  }

  /**
   * Lấy chi tiết một phiếu đánh giá theo ID.
   * Sinh viên chỉ xem được phiếu của mình; ban cán sự và admin xem được mọi phiếu.
   */
  async findOne(
    userId: string,
    role: UserRole,
    id: string,
  ): Promise<EvaluationDetailResponse> {
    const evaluation = await this.findOwned<
      typeof evaluationDetailSelect,
      EvaluationDetailRecord
    >(userId, role, id, evaluationDetailSelect, {
      relationLoadStrategy: 'join',
    });
    return mapToDetailResponse(evaluation);
  }

  /**
   * Lấy tóm tắt điểm toàn phiếu: điểm SV tự chấm, điểm lớp, điểm cuối,
   * điểm từng mục và trạng thái trong luồng duyệt.
   * Sinh viên chỉ xem được phiếu của mình; ban cán sự và admin xem được mọi phiếu.
   */
  async getSummary(
    userId: string,
    role: UserRole,
    id: string,
  ): Promise<EvaluationScoreSummaryResponse> {
    const evaluation = await this.findOwned<
      typeof evaluationScoreSummarySelect,
      EvaluationScoreSummaryRecord
    >(userId, role, id, evaluationScoreSummarySelect, {
      // One many-to-one relation (semester); measured lower Supabase round-trips with identical payload.
      relationLoadStrategy: 'join',
    });
    return mapToScoreSummaryResponse(evaluation);
  }

  /**
   * Lấy trạng thái hiện tại và lịch sử duyệt phiếu (4 bước).
   * Sinh viên chỉ xem được phiếu của mình; ban cán sự và admin xem được mọi phiếu.
   */
  async getStatus(
    userId: string,
    role: UserRole,
    id: string,
  ): Promise<EvaluationStatusResponse> {
    const evaluation = await this.findOwned<
      typeof evaluationStatusSelect,
      EvaluationStatusRecord
    >(userId, role, id, evaluationStatusSelect, {
      // One many-to-one relation (semester); measured lower Supabase round-trips with identical payload.
      relationLoadStrategy: 'join',
    });
    return mapToStatusResponse(evaluation);
  }

  /**
   * Sinh viên nộp phiếu để lớp/CVHT duyệt.
   * Chỉ nộp được khi phiếu đang là draft hoặc bị trả về (rejected).
   * Khi nộp, hệ thống tính lại tổng điểm và reset toàn bộ thông tin duyệt cũ.
   */
  async submit(
    userId: string,
    id: string,
  ): Promise<EvaluationScoreSummaryResponse> {
    const current = await this.prisma.evaluationForm.findFirst({
      where: { id, studentId: userId },
      select: evaluationScoreSummarySelect,
    });

    if (!current) {
      throw new NotFoundException('Không tìm thấy phiếu đánh giá');
    }

    assertNotLocked(current);

    if (
      !([FormStatus.draft, FormStatus.rejected] as FormStatus[]).includes(
        current.status,
      )
    ) {
      throw new ConflictException(
        'Chỉ phiếu ở trạng thái nháp hoặc bị trả về mới có thể nộp',
      );
    }

    const scoreResult = calculateScoreResult({
      studyScore: current.studyScore,
      disciplineScore: current.disciplineScore,
      activityScore: current.activityScore,
      communityScore: current.communityScore,
      roleScore: current.roleScore,
    });

    const evaluation = await this.prisma.evaluationForm.update({
      where: { id },
      data: {
        status: FormStatus.submitted,
        submittedAt: new Date(),
        studentScore: scoreResult.totalScore,
        rank: scoreResult.rank,
        classScore: null,
        finalScore: null,
        classReviewedBy: null,
        classReviewedAt: null,
        adminFinalizedBy: null,
        adminFinalizedAt: null,
      },
      select: evaluationScoreSummarySelect,
    });

    return mapToScoreSummaryResponse(evaluation);
  }

  /**
   * Lớp trưởng/CVHT cập nhật điểm thẩm định theo từng tiêu chí.
   * Chỉ class_council được phân công đúng lớp của phiếu mới được thao tác.
   */
  async reviewScores(
    userId: string,
    id: string,
    dto: ReviewScoresDto,
  ): Promise<EvaluationScoreSummaryResponse> {
    const form = await this.prisma.evaluationForm.findUnique({
      where: { id },
      select: {
        id: true,
        classId: true,
        status: true,
        isLocked: true,
      },
    });

    if (!form) {
      throw new NotFoundException('Không tìm thấy phiếu đánh giá rèn luyện');
    }

    assertNotLocked(form);
    await this.assertReviewerAssigned(
      UserRole.ClassCouncil,
      userId,
      form.classId,
    );

    if (
      !(
        [FormStatus.submitted, FormStatus.class_approved] as FormStatus[]
      ).includes(form.status)
    ) {
      throw new ConflictException(
        'Điểm thẩm định cấp lớp chỉ được cập nhật trước khi chuyển lên cấp khoa',
      );
    }

    const criteriaCodes = [
      ...new Set(dto.scores.map((score) => score.criteriaCode)),
    ];
    const criteria = await this.prisma.evaluationCriteria.findMany({
      where: { code: { in: criteriaCodes }, isActive: true },
      select: { id: true, code: true, maxScore: true },
    });
    const criteriaByCode = new Map(
      criteria.map((criterion) => [criterion.code, criterion]),
    );

    for (const item of dto.scores) {
      const criterion = criteriaByCode.get(item.criteriaCode);

      if (!criterion) {
        throw new NotFoundException(
          `Không tìm thấy tiêu chí đánh giá ${item.criteriaCode}`,
        );
      }

      if (item.classScore > criterion.maxScore) {
        throw new BadRequestException(
          `classScore của ${item.criteriaCode} không được vượt quá ${criterion.maxScore}`,
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.scores) {
        const criterion = criteriaByCode.get(item.criteriaCode)!;

        await tx.formCriteriaScore.upsert({
          where: {
            formId_criteriaId: {
              formId: id,
              criteriaId: criterion.id,
            },
          },
          create: {
            formId: id,
            criteriaId: criterion.id,
            classScore: item.classScore,
            note: item.reviewerNote ?? null,
          },
          update: {
            classScore: item.classScore,
            note: item.reviewerNote ?? null,
          },
          select: { id: true },
        });
      }

      const scores = await tx.formCriteriaScore.findMany({
        where: { formId: id, classScore: { not: null } },
        select: { classScore: true },
      });
      const classScore = scores.reduce(
        (total, score) => total + (score.classScore ?? 0),
        0,
      );

      return tx.evaluationForm.update({
        where: { id },
        data: { classScore },
        select: evaluationScoreSummarySelect,
      });
    });

    return mapToScoreSummaryResponse(updated);
  }

  /**
   * Duyệt phiếu theo state machine đa cấp:
   * submitted -> class_approved -> finalized.
   * REJECT ở bất kỳ cấp đang duyệt sẽ trả về rejected để sinh viên sửa lại.
   */
  async review(
    reviewer: AuthenticatedUser,
    id: string,
    dto: ReviewTrainingEvaluationDto,
  ): Promise<EvaluationScoreSummaryResponse> {
    const evaluation = await this.prisma.evaluationForm.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        status: true,
        classId: true,
        classScore: true,
      },
    });

    if (!evaluation) {
      throw new NotFoundException('Không tìm thấy phiếu đánh giá');
    }

    const stage = resolveReviewStage(reviewer.role, evaluation.status);
    await this.assertReviewerAssigned(
      reviewer.role,
      reviewer.id,
      evaluation.classId,
    );

    if (dto.action === 'reject') {
      const { rejected, notification } = await this.prisma.$transaction(
        async (tx) => {
          const rejected = await tx.evaluationForm.update({
            where: { id },
            data: {
              status: FormStatus.rejected,
              note: `${stage.notePrefix} ${dto.comment}`,
            },
            select: evaluationScoreSummarySelect,
          });

          const notification = await tx.notification.create({
            data: {
              userId: evaluation.studentId,
              type: NotificationType.EVALUATION_REJECTED,
              title: 'Phiếu đánh giá bị trả lại',
              content:
                dto.comment ??
                'Phiếu đánh giá rèn luyện cần được chỉnh sửa và nộp lại.',
            },
            select: notificationSelect,
          });

          return { rejected, notification };
        },
      );

      this.notificationsService.emitCreated(
        mapToNotificationResponse(notification),
      );

      return mapToScoreSummaryResponse(rejected);
    }

    const data: Prisma.EvaluationFormUncheckedUpdateInput = {
      status: stage.nextApprovedStatus,
    };

    if (reviewer.role === UserRole.ClassCouncil) {
      if (dto.classScore === undefined) {
        throw new BadRequestException(
          'classScore là bắt buộc khi lớp/CVHT duyệt phiếu',
        );
      }

      data.classScore = dto.classScore;
      data.rank = calculateClassification(dto.classScore);
      data.classReviewedBy = reviewer.id;
      data.classReviewedAt = new Date();
    } else {
      // UserRole.Admin — phê duyệt cuối, chốt finalScore từ điểm lớp đã duyệt.
      if (evaluation.classScore === null) {
        throw new ConflictException(
          'Phiếu chưa có điểm lớp chấm, không thể phê duyệt cuối',
        );
      }

      data.finalScore = evaluation.classScore;
      data.rank = calculateClassification(evaluation.classScore);
      data.adminFinalizedBy = reviewer.id;
      data.adminFinalizedAt = new Date();
    }

    const approved = await this.prisma.evaluationForm.update({
      where: { id },
      data,
      select: evaluationScoreSummarySelect,
    });

    return mapToScoreSummaryResponse(approved);
  }

  /**
   * Cập nhật thông tin nháp của phiếu: số điện thoại và/hoặc ghi chú.
   * Chỉ cập nhật được khi phiếu đang ở trạng thái có thể chỉnh sửa.
   * Cập nhật SĐT trực tiếp lên bảng User (dùng chung với profile).
   */
  async updateDraft(
    userId: string,
    id: string,
    dto: UpdateTrainingEvaluationDraftDto,
  ): Promise<EvaluationDetailResponse> {
    const hasPhone = Object.prototype.hasOwnProperty.call(dto, 'phone');
    const hasNote = Object.prototype.hasOwnProperty.call(dto, 'note');

    if (!hasPhone && !hasNote) {
      throw new BadRequestException(
        'Chưa cung cấp thông tin nháp nào để cập nhật',
      );
    }

    const form = await this.findOwnedForWrite(userId, id);
    assertNotLocked(form);
    assertEditable(form.status);

    await this.prisma.$transaction(async (tx) => {
      if (hasPhone) {
        await tx.user.update({
          where: { id: userId },
          data: { phone: dto.phone ?? null },
          select: { id: true },
        });
      }

      if (hasNote) {
        await tx.evaluationForm.update({
          where: { id },
          data: { note: dto.note ?? null },
          select: { id: true },
        });
      }
    });

    // Đọc lại sau khi cập nhật, tránh gọi findOne() thừa một vòng
    const updated = await this.prisma.evaluationForm.findFirst({
      where: { id, studentId: userId },
      select: evaluationDetailSelect,
    });

    return mapToDetailResponse(updated!);
  }

  // ─── Mục I – Ý thức học tập (max 20đ) ────────────────────────────────────────

  /**
   * Cập nhật điểm Mục I – Ý thức học tập.
   * Tính điểm theo 3 tiêu chí: điểm TB thường xuyên + hoạt động học thuật + xếp loại TBCHT.
   * Sau khi cập nhật, tổng điểm phiếu được tính lại ngay lập tức.
   */
  async updateStudyScore(
    userId: string,
    id: string,
    dto: UpdateStudyScoreDto,
  ): Promise<StudyScoreResponse> {
    const current = await this.findOwnedForWrite(userId, id, {
      disciplineScore: true,
      activityScore: true,
      communityScore: true,
      roleScore: true,
    });
    assertNotLocked(current);
    assertEditable(current.status);

    const activities = dto.activities.map((a) => ({
      code: a.code,
      checked: a.checked,
      score: STUDY_ACTIVITY_POINTS[a.code],
    }));
    const activityTotal = activities.reduce(
      (sum, a) => sum + (a.checked ? a.score : 0),
      0,
    );
    const score =
      REGULAR_SCORE_POINTS[dto.regularScoreLevel] +
      activityTotal +
      ACADEMIC_RANK_POINTS[dto.academicRank];

    const { totalScore, rank } = calculateScoreResult({
      studyScore: score,
      disciplineScore: current.disciplineScore,
      activityScore: current.activityScore,
      communityScore: current.communityScore,
      roleScore: current.roleScore,
    });

    const updated = await this.prisma.evaluationForm.update({
      where: { id },
      data: {
        studyScore: score,
        studyData: {
          regularScoreLevel: dto.regularScoreLevel,
          academicRank: dto.academicRank,
          activities,
        },
        studentScore: totalScore,
        rank,
      },
      select: studyScoreSelect,
    });

    return mapToStudyScoreResponse(updated);
  }

  // ─── Mục II – Ý thức chấp hành kỷ luật (max 25đ) ────────────────────────────

  /**
   * Cập nhật điểm Mục II – Ý thức chấp hành kỷ luật.
   * Điểm được FE nhập trực tiếp trong khoảng 0–25.
   * Danh sách vi phạm chỉ còn là dữ liệu mô tả kèm theo, không tự động trừ điểm.
   */
  async updateDisciplineScore(
    userId: string,
    id: string,
    dto: UpdateDisciplineScoreDto,
  ): Promise<DisciplineScoreResponse> {
    const current = await this.findOwnedForWrite(userId, id, {
      studyScore: true,
      activityScore: true,
      communityScore: true,
      roleScore: true,
    });
    assertNotLocked(current);
    assertEditable(current.status);

    const violations = (dto.violations ?? []).map((v) => ({
      code: v.code,
      count: v.count,
      deductScore: v.deductScore,
    }));
    const score = dto.baseScore;

    const { totalScore, rank } = calculateScoreResult({
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
        disciplineData: { baseScore: dto.baseScore, violations },
        studentScore: totalScore,
        rank,
      },
      select: disciplineScoreSelect,
    });

    return mapToDisciplineScoreResponse(updated);
  }

  // ─── Mục III – Hoạt động chính trị, VH, thể thao (max 20đ) ──────────────────

  /**
   * Cập nhật điểm Mục III – Hoạt động chính trị, VH, thể thao.
   * Tổng điểm = tổng 4 tiêu chí + điểm khen thưởng, tối đa 20.
   */
  async updateActivityScore(
    userId: string,
    id: string,
    dto: UpdateActivityScoreDto,
  ): Promise<ActivityScoreResponse> {
    const current = await this.findOwnedForWrite(userId, id, {
      studyScore: true,
      disciplineScore: true,
      communityScore: true,
      roleScore: true,
    });
    assertNotLocked(current);
    assertEditable(current.status);

    const score = Math.min(
      20,
      POLITICAL_ACTIVITY_POINTS[dto.politicalActivityLevel] +
        CULTURE_SPORT_POINTS[dto.cultureSportLevel] +
        CLUB_ACTIVITY_POINTS[dto.clubActivityLevel] +
        SOCIAL_PREVENTION_POINTS[dto.socialPreventionLevel] +
        dto.rewardScore,
    );

    const { totalScore, rank } = calculateScoreResult({
      studyScore: current.studyScore,
      disciplineScore: current.disciplineScore,
      activityScore: score,
      communityScore: current.communityScore,
      roleScore: current.roleScore,
    });

    const updated = await this.prisma.evaluationForm.update({
      where: { id },
      data: {
        activityScore: score,
        activityData: {
          politicalActivityLevel: dto.politicalActivityLevel,
          cultureSportLevel: dto.cultureSportLevel,
          clubActivityLevel: dto.clubActivityLevel,
          socialPreventionLevel: dto.socialPreventionLevel,
          rewardScore: dto.rewardScore,
        },
        studentScore: totalScore,
        rank,
      },
      select: activityScoreSelect,
    });

    return mapToActivityScoreResponse(updated);
  }

  // ─── Mục IV – Ý thức công dân trong cộng đồng (max 25đ) ──────────────────────

  /**
   * Cập nhật điểm Mục IV – Ý thức công dân trong cộng đồng.
   * Tổng điểm = chấp hành pháp luật + tình nguyện + quan hệ cộng đồng, tối đa 25.
   */
  async updateCommunityScore(
    userId: string,
    id: string,
    dto: UpdateCommunityScoreDto,
  ): Promise<CommunityScoreResponse> {
    const current = await this.findOwnedForWrite(userId, id, {
      studyScore: true,
      disciplineScore: true,
      activityScore: true,
      roleScore: true,
    });
    assertNotLocked(current);
    assertEditable(current.status);

    const score = Math.min(
      25,
      LAW_COMPLIANCE_POINTS[dto.lawComplianceLevel] +
        VOLUNTEER_ACTIVITY_POINTS[dto.volunteerActivityLevel] +
        COMMUNITY_RELATIONSHIP_POINTS[dto.communityRelationshipLevel],
    );

    const { totalScore, rank } = calculateScoreResult({
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
        communityData: {
          lawComplianceLevel: dto.lawComplianceLevel,
          volunteerActivityLevel: dto.volunteerActivityLevel,
          communityRelationshipLevel: dto.communityRelationshipLevel,
        },
        studentScore: totalScore,
        rank,
      },
      select: communityScoreSelect,
    });

    return mapToCommunityScoreResponse(updated);
  }

  // ─── Mục V – Vai trò BCS lớp / BCH tổ chức (max 10đ) ────────────────────────

  /**
   * Cập nhật điểm Mục V – Vai trò BCS lớp / BCH tổ chức.
   * Logic tính điểm phụ thuộc vào loại sinh viên (NORMAL_STUDENT hay cán bộ).
   */
  async updateRoleScore(
    userId: string,
    id: string,
    dto: UpdateRoleScoreDto,
  ): Promise<RoleScoreResponse> {
    const current = await this.findOwnedForWrite(userId, id, {
      studyScore: true,
      disciplineScore: true,
      activityScore: true,
      communityScore: true,
    });
    assertNotLocked(current);
    assertEditable(current.status);

    const score = calculateRoleScore(dto);
    const { totalScore, rank } = calculateScoreResult({
      studyScore: current.studyScore,
      disciplineScore: current.disciplineScore,
      activityScore: current.activityScore,
      communityScore: current.communityScore,
      roleScore: score,
    });

    const updated = await this.prisma.evaluationForm.update({
      where: { id },
      data: {
        roleScore: score,
        roleData: {
          studentRoleType: dto.studentRoleType,
          positionGroup: dto.positionGroup ?? null,
          taskCompletionLevel: dto.taskCompletionLevel ?? null,
          managementSkillLevel: dto.managementSkillLevel ?? null,
          normalStudentActivityScore: dto.normalStudentActivityScore ?? null,
          specialAchievementLevel: dto.specialAchievementLevel ?? null,
        },
        studentScore: totalScore,
        rank,
      },
      select: roleScoreSelect,
    });

    return mapToRoleScoreResponse(updated);
  }

  // ─── Private: DB queries ────────────────────────────────────────────────────

  /**
   * Query phiếu để đọc với phân quyền theo role.
   * Student chỉ xem phiếu của mình; ClassCouncil/Admin xem phiếu theo quyền.
   */
  private async findOwned<TSelect extends Prisma.EvaluationFormSelect, TResult>(
    userId: string,
    role: UserRole,
    id: string,
    select: TSelect,
    options?: { relationLoadStrategy?: Prisma.RelationLoadStrategy },
  ): Promise<TResult> {
    const where =
      role === UserRole.Student ? { id, studentId: userId } : { id };

    const evaluation = await this.prisma.evaluationForm.findFirst({
      where,
      select,
      ...options,
    });

    if (!evaluation) {
      throw new NotFoundException('Không tìm thấy phiếu đánh giá');
    }

    return evaluation as TResult;
  }

  /**
   * Query phiếu để ghi (write), luôn lọc theo studentId.
   * Tự động include `id` và `status` để kiểm tra quyền chỉnh sửa.
   * Select thêm các điểm mục còn lại nếu cần tính lại tổng điểm.
   */
  private async findOwnedForWrite<
    TSelect extends Prisma.EvaluationFormSelect = Record<never, never>,
  >(userId: string, id: string, select?: TSelect) {
    const evaluation = await this.prisma.evaluationForm.findFirst({
      where: { id, studentId: userId },
      select: { id: true, status: true, isLocked: true, ...select },
    });

    if (!evaluation) {
      throw new NotFoundException('Không tìm thấy phiếu đánh giá');
    }

    return evaluation;
  }

  private async assertReviewerAssigned(
    role: UserRole,
    reviewerId: string,
    classId: string,
  ): Promise<void> {
    if (role === UserRole.Admin) {
      return;
    }

    if (role === UserRole.ClassCouncil) {
      const assignment = await this.prisma.classCouncilAssignment.findUnique({
        where: { userId_classId: { userId: reviewerId, classId } },
        select: { id: true },
      });

      if (!assignment) {
        throw new ForbiddenException(
          'Bạn không được phân công phụ trách lớp này',
        );
      }

      return;
    }

    throw new ForbiddenException(
      'Vai trò này không có quyền duyệt phiếu đánh giá',
    );
  }

  private async assertCanListEvaluations(
    user: AuthenticatedUser,
    classId: string | undefined,
  ): Promise<void> {
    if (user.role === UserRole.Admin) {
      return;
    }

    if (user.role !== UserRole.ClassCouncil) {
      throw new ForbiddenException(
        'Bạn không có quyền xem danh sách phiếu này',
      );
    }

    if (!classId) {
      throw new BadRequestException('Vui lòng chọn lớp cần xem');
    }

    await this.assertReviewerAssigned(
      UserRole.ClassCouncil,
      user.id,
      classId,
    );
  }
}
