import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FormStatus,
  Prisma,
  SemesterNo,
} from '../../generated/prisma/client';
import { UserRole } from 'src/common/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateTrainingEvaluationDto,
  type TrainingEvaluationSemester,
} from './dto/create-training-evaluation.dto';
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
  mapToRoleScoreResponse,
  mapToScoreSummaryResponse,
  mapToStatusResponse,
  mapToStudyScoreResponse,
} from './helpers/evaluation.mapper';
import {
  assertEditable,
  calculateRoleScore,
  calculateScoreResult,
} from './helpers/score.calculator';
import {
  activityScoreSelect,
  communityScoreSelect,
  disciplineScoreSelect,
  evaluationDetailSelect,
  evaluationListSelect,
  evaluationScoreSummarySelect,
  evaluationStatusSelect,
  roleScoreSelect,
  studyScoreSelect,
  type ActivityScoreRecord,
  type CommunityScoreRecord,
  type DisciplineScoreRecord,
  type EvaluationDetailRecord,
  type EvaluationScoreSummaryRecord,
  type EvaluationStatusRecord,
  type RoleScoreRecord,
  type StudyScoreRecord,
} from './selects/evaluation-form.select';
import type {
  ActivityScoreResponse,
  CommunityScoreResponse,
  DisciplineScoreResponse,
  EvaluationDetailResponse,
  EvaluationListResponse,
  EvaluationScoreSummaryResponse,
  EvaluationStatusResponse,
  RoleScoreResponse,
  StudyScoreResponse,
} from './types/evaluation-form.types';

@Injectable()
export class TrainingEvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const academicYearStart = this.parseAcademicYearStart(dto.academicYear);
    const semesterNo = this.toSemesterNo(dto.semester);

    const [semester, currentClass] = await Promise.all([
      this.prisma.semester.findUnique({
        where: { year_semester: { year: academicYearStart, semester: semesterNo } },
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
          'Training evaluation already exists for this semester and academic year',
        );
      }

      throw error;
    }
  }

  /**
   * Lấy danh sách tất cả phiếu của sinh viên đang đăng nhập,
   * sắp xếp mới nhất lên đầu.
   */
  async findMine(userId: string): Promise<EvaluationListResponse[]> {
    const evaluations = await this.prisma.evaluationForm.findMany({
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
    >(userId, role, id, evaluationDetailSelect);
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
    >(userId, role, id, evaluationScoreSummarySelect);
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
    >(userId, role, id, evaluationStatusSelect);
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
      throw new NotFoundException('Training evaluation was not found');
    }

    if (
      !([FormStatus.draft, FormStatus.rejected] as FormStatus[]).includes(
        current.status,
      )
    ) {
      throw new ConflictException(
        'Only draft or rejected evaluations can be submitted',
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
        facultyReviewedBy: null,
        facultyReviewedAt: null,
        adminFinalizedBy: null,
        adminFinalizedAt: null,
      },
      select: evaluationScoreSummarySelect,
    });

    return mapToScoreSummaryResponse(evaluation);
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
      throw new BadRequestException('No draft information provided');
    }

    const form = await this.findOwnedForWrite(userId, id);
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

  /** Lấy điểm và dữ liệu Mục I (ý thức học tập). */
  async getStudyScore(
    userId: string,
    role: UserRole,
    id: string,
  ): Promise<StudyScoreResponse> {
    const evaluation = await this.findOwned<
      typeof studyScoreSelect,
      StudyScoreRecord
    >(userId, role, id, studyScoreSelect);
    return mapToStudyScoreResponse(evaluation);
  }

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
        studyData: { regularScoreLevel: dto.regularScoreLevel, academicRank: dto.academicRank, activities },
        studentScore: totalScore,
        rank,
      },
      select: studyScoreSelect,
    });

    return mapToStudyScoreResponse(updated);
  }

  // ─── Mục II – Ý thức chấp hành kỷ luật (max 25đ) ────────────────────────────

  /** Lấy điểm và dữ liệu Mục II (kỷ luật). */
  async getDisciplineScore(
    userId: string,
    role: UserRole,
    id: string,
  ): Promise<DisciplineScoreResponse> {
    const evaluation = await this.findOwned<
      typeof disciplineScoreSelect,
      DisciplineScoreRecord
    >(userId, role, id, disciplineScoreSelect);
    return mapToDisciplineScoreResponse(evaluation);
  }

  /**
   * Cập nhật điểm Mục II – Ý thức chấp hành kỷ luật.
   * Điểm = baseScore (25) − tổng điểm trừ từ các vi phạm, tối thiểu là 0.
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
    assertEditable(current.status);

    const violations = dto.violations.map((v) => ({
      code: v.code,
      count: v.count,
      deductScore: v.deductScore,
    }));
    const deducted = violations.reduce(
      (sum, v) => sum + v.count * v.deductScore,
      0,
    );
    const score = Math.max(0, dto.baseScore - deducted);

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

  /** Lấy điểm và dữ liệu Mục III (hoạt động). */
  async getActivityScore(
    userId: string,
    role: UserRole,
    id: string,
  ): Promise<ActivityScoreResponse> {
    const evaluation = await this.findOwned<
      typeof activityScoreSelect,
      ActivityScoreRecord
    >(userId, role, id, activityScoreSelect);
    return mapToActivityScoreResponse(evaluation);
  }

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

  /** Lấy điểm và dữ liệu Mục IV (cộng đồng). */
  async getCommunityScore(
    userId: string,
    role: UserRole,
    id: string,
  ): Promise<CommunityScoreResponse> {
    const evaluation = await this.findOwned<
      typeof communityScoreSelect,
      CommunityScoreRecord
    >(userId, role, id, communityScoreSelect);
    return mapToCommunityScoreResponse(evaluation);
  }

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

  /** Lấy điểm và dữ liệu Mục V (vai trò BCS/BCH). */
  async getRoleScore(
    userId: string,
    role: UserRole,
    id: string,
  ): Promise<RoleScoreResponse> {
    const evaluation = await this.findOwned<
      typeof roleScoreSelect,
      RoleScoreRecord
    >(userId, role, id, roleScoreSelect);
    return mapToRoleScoreResponse(evaluation);
  }

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
   * Student chỉ xem phiếu của mình; ClassCouncil/FacultyCouncil/Admin xem bất kỳ phiếu nào.
   */
  private async findOwned<
    TSelect extends Prisma.EvaluationFormSelect,
    TResult,
  >(
    userId: string,
    role: UserRole,
    id: string,
    select: TSelect,
  ): Promise<TResult> {
    const where =
      role === UserRole.Student
        ? { id, studentId: userId }
        : { id };

    const evaluation = await this.prisma.evaluationForm.findFirst({
      where,
      select,
    });

    if (!evaluation) {
      throw new NotFoundException('Training evaluation was not found');
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
      select: { id: true, status: true, ...select },
    });

    if (!evaluation) {
      throw new NotFoundException('Training evaluation was not found');
    }

    return evaluation;
  }

  // ─── Private: Input helpers ─────────────────────────────────────────────────

  /**
   * Parse và validate chuỗi năm học "YYYY-YYYY", trả về năm bắt đầu.
   * Ví dụ: "2024-2025" → 2024. Kiểm tra đây là dãy năm liên tiếp.
   */
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

  /**
   * Chuyển chuỗi học kỳ API (HK1/HK2/SUMMER) sang enum SemesterNo của DB.
   */
  private toSemesterNo(semester: TrainingEvaluationSemester): SemesterNo {
    const map: Record<TrainingEvaluationSemester, SemesterNo> = {
      HK1: SemesterNo.SEMESTER_1,
      HK2: SemesterNo.SEMESTER_2,
      SUMMER: SemesterNo.summer,
    };

    return map[semester];
  }
}
