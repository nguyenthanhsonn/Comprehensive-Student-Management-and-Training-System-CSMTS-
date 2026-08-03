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
import { ReturnEvaluationToStudentDto } from './dto/return-evaluation-to-student.dto';
import { ReviewTrainingEvaluationDto } from './dto/review-training-evaluation.dto';
import { ReviewScoresDto } from './dto/review-scores.dto';
import { SubmitClassToAdvisorDto } from './dto/submit-class-to-advisor.dto';
import { SubmitClassToFacultyDto } from './dto/submit-class-to-faculty.dto';
import { SubmitFacultyToTrainingDepartmentDto } from './dto/submit-faculty-to-training-department.dto';
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
    const { facultyId: scopeFacultyId } = await this.assertCanListEvaluations(
      user,
      query.classId,
      query.facultyId,
    );

    const targetFacultyId = scopeFacultyId ?? query.facultyId;

    const semesterId = await resolveSemesterId(
      this.prisma,
      query.semester,
      query.academicYear,
    );

    const where: Prisma.EvaluationFormWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.classId && { classId: query.classId }),
      ...(targetFacultyId && {
        class: { major: { facultyId: targetFacultyId } },
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
   * Lớp trưởng gửi toàn bộ phiếu sinh viên đã nộp trong lớp lên CVHT.
   * Chỉ chuyển các phiếu đang `submitted`; các phiếu nháp, bị trả về, đã gửi
   * lên CVHT, đã CVHT duyệt hoặc đã chốt cuối được giữ nguyên để tránh ghi đè audit.
   */
  async submitClassToAdvisor(
    reviewer: AuthenticatedUser,
    classId: string,
    dto: SubmitClassToAdvisorDto,
  ) {
    const classRecord = await this.prisma.class.findFirst({
      where: { id: classId, deletedAt: null },
      select: { id: true, code: true, name: true },
    });

    if (!classRecord) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    await this.assertReviewerAssigned(UserRole.ClassLeader, reviewer.id, classId);

    const advisorAssignments = await this.prisma.advisorAssignment.findMany({
      where: { classId },
      select: {
        userId: true,
        user: { select: { id: true, fullName: true, isActive: true, deletedAt: true } },
      },
    });
    const activeAdvisors = advisorAssignments.filter(
      (assignment) => assignment.user.isActive && !assignment.user.deletedAt,
    );

    if (activeAdvisors.length === 0) {
      throw new BadRequestException('Lớp chưa được gán cố vấn học tập');
    }

    const semester = dto.semesterId
      ? await this.prisma.semester.findUnique({
          where: { id: dto.semesterId },
          select: { id: true, year: true, semester: true },
        })
      : await this.prisma.semester.findFirst({
          where: { isActive: true },
          select: { id: true, year: true, semester: true },
          orderBy: [{ year: 'desc' }, { semester: 'desc' }],
        });

    if (!semester) {
      throw new NotFoundException('Không tìm thấy học kỳ đánh giá');
    }

    const whereBase: Prisma.EvaluationFormWhereInput = {
      classId,
      semesterId: semester.id,
    };
    const targetWhere: Prisma.EvaluationFormWhereInput = {
      ...whereBase,
      ...(dto.evaluationIds && { id: { in: dto.evaluationIds } }),
    };
    const [
      totalForms,
      eligibleForms,
      missingConfirmationCount,
      alreadyForwardedCount,
      notReadyCount,
    ] = await Promise.all([
      this.prisma.evaluationForm.count({ where: targetWhere }),
      this.prisma.evaluationForm.findMany({
        where: {
          ...targetWhere,
          status: FormStatus.submitted,
          classLeaderReviewedAt: { not: null },
          isLocked: false,
        },
        select: { id: true },
      }),
      this.prisma.evaluationForm.count({
        where: {
          ...targetWhere,
          status: FormStatus.submitted,
          classLeaderReviewedAt: null,
          isLocked: false,
        },
      }),
      this.prisma.evaluationForm.count({
        where: {
          ...targetWhere,
          status: {
            in: [
              FormStatus.class_leader_approved,
              FormStatus.class_approved,
              FormStatus.faculty_approved,
              FormStatus.finalized,
            ],
          },
        },
      }),
      this.prisma.evaluationForm.count({
        where: {
          ...targetWhere,
          status: { in: [FormStatus.draft, FormStatus.rejected] },
        },
      }),
    ]);

    if (eligibleForms.length === 0) {
      throw new ConflictException(
        missingConfirmationCount > 0
          ? 'Các phiếu đang chờ gửi lên CVHT chưa được lớp trưởng xác nhận'
          : 'Không có phiếu nào đang chờ lớp trưởng gửi lên CVHT',
      );
    }

    const submittedToAdvisorAt = new Date();
    const eligibleIds = eligibleForms.map((form) => form.id);
    const { updatedCount, notifications } = await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.evaluationForm.updateMany({
          where: { id: { in: eligibleIds }, status: FormStatus.submitted },
          data: {
            status: FormStatus.class_leader_approved,
          },
        });

        const notifications =
          updated.count > 0
            ? await Promise.all(
                activeAdvisors.map((assignment) =>
                  tx.notification.create({
                    data: {
                      userId: assignment.userId,
                      type: NotificationType.GENERAL,
                      title: 'Lớp trưởng đã gửi danh sách đánh giá',
                      content: `Lớp ${classRecord.code} đã gửi ${updated.count} phiếu đánh giá rèn luyện lên CVHT. Vui lòng kiểm tra và duyệt tiếp.`,
                    },
                    select: notificationSelect,
                  }),
                ),
              )
            : [];

        return { updatedCount: updated.count, notifications };
      },
    );

    for (const notification of notifications) {
      this.notificationsService.emitCreated(
        mapToNotificationResponse(notification),
      );
    }

    return {
      classId: classRecord.id,
      classCode: classRecord.code,
      className: classRecord.name,
      semesterId: semester.id,
      academicYear: `${semester.year}-${semester.year + 1}`,
      fromStatus: FormStatus.submitted,
      toStatus: FormStatus.class_leader_approved,
      submittedToAdvisorAt,
      submittedCount: updatedCount,
      requestedCount: dto.evaluationIds?.length ?? null,
      totalForms,
      notReadyCount,
      missingConfirmationCount,
      alreadyForwardedCount,
      advisorIds: activeAdvisors.map((assignment) => assignment.userId),
      message: `Đã gửi ${updatedCount} phiếu đánh giá của lớp ${classRecord.code} lên CVHT.`,
    };
  }

  /**
   * CVHT gửi toàn bộ phiếu đã được lớp trưởng chuyển lên khoa/cấp trên.
   * Chỉ chuyển các phiếu đang `class_leader_approved` và đã có `classScore`.
   */
  async submitClassToFaculty(
    reviewer: AuthenticatedUser,
    classId: string,
    dto: SubmitClassToFacultyDto,
  ) {
    const classRecord = await this.prisma.class.findFirst({
      where: { id: classId, deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        major: {
          select: {
            faculty: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    await this.assertReviewerAssigned(UserRole.Advisor, reviewer.id, classId);

    const facultyAssignments = await this.prisma.facultyAssignment.findMany({
      where: { facultyId: classRecord.major.faculty.id },
      select: {
        userId: true,
        user: {
          select: { id: true, fullName: true, isActive: true, deletedAt: true },
        },
      },
    });
    const activeFacultyUsers = facultyAssignments.filter(
      (assignment) => assignment.user.isActive && !assignment.user.deletedAt,
    );

    if (activeFacultyUsers.length === 0) {
      throw new BadRequestException('Khoa của lớp chưa được gán tài khoản phụ trách');
    }

    const semester = dto.semesterId
      ? await this.prisma.semester.findUnique({
          where: { id: dto.semesterId },
          select: { id: true, year: true, semester: true },
        })
      : await this.prisma.semester.findFirst({
          where: { isActive: true },
          select: { id: true, year: true, semester: true },
          orderBy: [{ year: 'desc' }, { semester: 'desc' }],
        });

    if (!semester) {
      throw new NotFoundException('Không tìm thấy học kỳ đánh giá');
    }

    const whereBase: Prisma.EvaluationFormWhereInput = {
      classId,
      semesterId: semester.id,
    };
    const targetWhere: Prisma.EvaluationFormWhereInput = {
      ...whereBase,
      ...(dto.evaluationIds && { id: { in: dto.evaluationIds } }),
    };
    const [
      totalForms,
      eligibleForms,
      missingClassScoreCount,
      missingConfirmationCount,
      alreadyForwardedCount,
      notReadyCount,
    ] = await Promise.all([
      this.prisma.evaluationForm.count({ where: targetWhere }),
      this.prisma.evaluationForm.findMany({
        where: {
          ...targetWhere,
          status: FormStatus.class_leader_approved,
          classScore: { not: null },
          classReviewedAt: { not: null },
          isLocked: false,
        },
        select: { id: true, classScore: true },
      }),
      this.prisma.evaluationForm.count({
        where: {
          ...targetWhere,
          status: FormStatus.class_leader_approved,
          classScore: null,
          isLocked: false,
        },
      }),
      this.prisma.evaluationForm.count({
        where: {
          ...targetWhere,
          status: FormStatus.class_leader_approved,
          classScore: { not: null },
          classReviewedAt: null,
          isLocked: false,
        },
      }),
      this.prisma.evaluationForm.count({
        where: {
          ...targetWhere,
          status: {
            in: [
              FormStatus.class_approved,
              FormStatus.faculty_approved,
              FormStatus.finalized,
            ],
          },
        },
      }),
      this.prisma.evaluationForm.count({
        where: {
          ...targetWhere,
          status: {
            in: [
              FormStatus.draft,
              FormStatus.submitted,
              FormStatus.rejected,
            ],
          },
        },
      }),
    ]);

    if (eligibleForms.length === 0) {
      throw new ConflictException(
        missingClassScoreCount > 0
          ? 'Các phiếu đang chờ CVHT gửi lên khoa chưa có điểm CVHT'
          : missingConfirmationCount > 0
            ? 'Các phiếu đang chờ gửi lên khoa chưa được CVHT xác nhận'
            : 'Không có phiếu nào đang chờ CVHT gửi lên khoa',
      );
    }

    const submittedToFacultyAt = new Date();
    const { updatedCount, notifications } = await this.prisma.$transaction(
      async (tx) => {
        let updatedCount = 0;

        for (const form of eligibleForms) {
          if (form.classScore === null) {
            continue;
          }

          await tx.evaluationForm.update({
            where: { id: form.id },
            data: {
              status: FormStatus.class_approved,
              rank: calculateClassification(form.classScore),
            },
          });
          updatedCount += 1;
        }

        const notifications =
          updatedCount > 0
            ? await Promise.all(
                activeFacultyUsers.map((assignment) =>
                  tx.notification.create({
                    data: {
                      userId: assignment.userId,
                      type: NotificationType.GENERAL,
                      title: 'CVHT đã gửi danh sách đánh giá',
                      content: `Lớp ${classRecord.code} đã gửi ${updatedCount} phiếu đánh giá rèn luyện lên khoa ${classRecord.major.faculty.code}.`,
                    },
                    select: notificationSelect,
                  }),
                ),
              )
            : [];

        return { updatedCount, notifications };
      },
    );

    for (const notification of notifications) {
      this.notificationsService.emitCreated(
        mapToNotificationResponse(notification),
      );
    }

    return {
      classId: classRecord.id,
      classCode: classRecord.code,
      className: classRecord.name,
      facultyId: classRecord.major.faculty.id,
      facultyCode: classRecord.major.faculty.code,
      facultyName: classRecord.major.faculty.name,
      semesterId: semester.id,
      academicYear: `${semester.year}-${semester.year + 1}`,
      fromStatus: FormStatus.class_leader_approved,
      toStatus: FormStatus.class_approved,
      submittedToFacultyAt,
      submittedCount: updatedCount,
      requestedCount: dto.evaluationIds?.length ?? null,
      totalForms,
      notReadyCount,
      missingClassScoreCount,
      missingConfirmationCount,
      alreadyForwardedCount,
      facultyUserIds: activeFacultyUsers.map((assignment) => assignment.userId),
      message: `Đã gửi ${updatedCount} phiếu đánh giá của lớp ${classRecord.code} lên khoa.`,
    };
  }

  /**
   * Khoa gửi toàn bộ phiếu đã được CVHT chốt lên Phòng Đào tạo.
   * Trạng thái `faculty_approved` là hàng đợi để PĐT duyệt cuối.
   */
  async submitFacultyToTrainingDepartment(
    reviewer: AuthenticatedUser,
    facultyId: string,
    dto: SubmitFacultyToTrainingDepartmentDto,
  ) {
    const assignment = await this.prisma.facultyAssignment.findUnique({
      where: { userId: reviewer.id },
      select: {
        facultyId: true,
        faculty: {
          select: { id: true, code: true, name: true, isActive: true, deletedAt: true },
        },
      },
    });

    if (
      !assignment ||
      assignment.facultyId !== facultyId ||
      !assignment.faculty.isActive ||
      assignment.faculty.deletedAt
    ) {
      throw new ForbiddenException('Bạn không được phân công phụ trách khoa này');
    }

    if (dto.classId) {
      const classRecord = await this.prisma.class.findFirst({
        where: {
          id: dto.classId,
          deletedAt: null,
          major: { facultyId },
        },
        select: { id: true, code: true, name: true },
      });

      if (!classRecord) {
        throw new NotFoundException('Không tìm thấy lớp thuộc khoa đang phụ trách');
      }
    }

    const trainingDepartmentUsers = await this.prisma.user.findMany({
      where: {
        role: UserRole.TrainingDepartment,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (trainingDepartmentUsers.length === 0) {
      throw new BadRequestException('Chưa có tài khoản Phòng Đào tạo đang hoạt động');
    }

    const semester = dto.semesterId
      ? await this.prisma.semester.findUnique({
          where: { id: dto.semesterId },
          select: { id: true, year: true, semester: true },
        })
      : await this.prisma.semester.findFirst({
          where: { isActive: true },
          select: { id: true, year: true, semester: true },
          orderBy: [{ year: 'desc' }, { semester: 'desc' }],
        });

    if (!semester) {
      throw new NotFoundException('Không tìm thấy học kỳ đánh giá');
    }

    const whereBase: Prisma.EvaluationFormWhereInput = {
      semesterId: semester.id,
      ...(dto.classId && { classId: dto.classId }),
      class: { major: { facultyId } },
    };
    const [
      totalForms,
      eligibleForms,
      missingClassScoreCount,
      alreadyForwardedCount,
      notReadyCount,
    ] = await Promise.all([
      this.prisma.evaluationForm.count({ where: whereBase }),
      this.prisma.evaluationForm.findMany({
        where: {
          ...whereBase,
          status: FormStatus.class_approved,
          classScore: { not: null },
          isLocked: false,
        },
        select: { id: true },
      }),
      this.prisma.evaluationForm.count({
        where: {
          ...whereBase,
          status: FormStatus.class_approved,
          classScore: null,
          isLocked: false,
        },
      }),
      this.prisma.evaluationForm.count({
        where: {
          ...whereBase,
          status: { in: [FormStatus.faculty_approved, FormStatus.finalized] },
        },
      }),
      this.prisma.evaluationForm.count({
        where: {
          ...whereBase,
          status: {
            in: [
              FormStatus.draft,
              FormStatus.submitted,
              FormStatus.class_leader_approved,
              FormStatus.rejected,
            ],
          },
        },
      }),
    ]);

    if (eligibleForms.length === 0) {
      throw new ConflictException(
        missingClassScoreCount > 0
          ? 'Các phiếu đang chờ khoa gửi lên PĐT chưa có điểm CVHT'
          : 'Không có phiếu nào đang chờ khoa gửi lên PĐT',
      );
    }

    const submittedToTrainingDepartmentAt = new Date();
    const eligibleIds = eligibleForms.map((form) => form.id);
    const { updatedCount, notifications } = await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.evaluationForm.updateMany({
          where: {
            id: { in: eligibleIds },
            status: FormStatus.class_approved,
          },
          data: { status: FormStatus.faculty_approved },
        });

        const notifications =
          updated.count > 0
            ? await Promise.all(
                trainingDepartmentUsers.map((user) =>
                  tx.notification.create({
                    data: {
                      userId: user.id,
                      type: NotificationType.GENERAL,
                      title: 'Khoa đã gửi danh sách đánh giá',
                      content: `Khoa ${assignment.faculty.code} đã gửi ${updated.count} phiếu đánh giá rèn luyện lên Phòng Đào tạo.`,
                    },
                    select: notificationSelect,
                  }),
                ),
              )
            : [];

        return { updatedCount: updated.count, notifications };
      },
    );

    for (const notification of notifications) {
      this.notificationsService.emitCreated(
        mapToNotificationResponse(notification),
      );
    }

    return {
      facultyId: assignment.faculty.id,
      facultyCode: assignment.faculty.code,
      facultyName: assignment.faculty.name,
      classId: dto.classId ?? null,
      semesterId: semester.id,
      academicYear: `${semester.year}-${semester.year + 1}`,
      fromStatus: FormStatus.class_approved,
      toStatus: FormStatus.faculty_approved,
      submittedToTrainingDepartmentAt,
      submittedCount: updatedCount,
      totalForms,
      notReadyCount,
      missingClassScoreCount,
      alreadyForwardedCount,
      trainingDepartmentUserIds: trainingDepartmentUsers.map((user) => user.id),
      message: `Đã gửi ${updatedCount} phiếu đánh giá của khoa ${assignment.faculty.code} lên Phòng Đào tạo.`,
    };
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
        classLeaderReviewedBy: null,
        classLeaderReviewedAt: null,
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
   * Chỉ người được phân công đúng lớp của phiếu mới được thao tác.
   */
  async reviewScores(
    reviewer: AuthenticatedUser,
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
      reviewer.role,
      reviewer.id,
      form.classId,
    );

    const expectedStatus =
      reviewer.role === UserRole.ClassLeader
        ? FormStatus.submitted
        : FormStatus.class_leader_approved;

    if (form.status !== expectedStatus) {
      throw new ConflictException(
        `Điểm thẩm định chỉ được cập nhật khi phiếu ở trạng thái ${expectedStatus}`,
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

      const confirmationResetData =
        reviewer.role === UserRole.ClassLeader
          ? {
              classLeaderReviewedBy: null,
              classLeaderReviewedAt: null,
            }
          : {
              classReviewedBy: null,
              classReviewedAt: null,
            };

      return tx.evaluationForm.update({
        where: { id },
        data: { classScore, ...confirmationResetData },
        select: evaluationScoreSummarySelect,
      });
    });

    return mapToScoreSummaryResponse(updated);
  }

  /**
   * Xác nhận cột điểm đã được người duyệt hiện tại kiểm tra xong.
   * Bước này chưa chuyển trạng thái phiếu; API batch gửi cấp tiếp theo sẽ chỉ
   * nhận những phiếu đã có dấu xác nhận tương ứng.
   */
  async confirmReview(
    reviewer: AuthenticatedUser,
    id: string,
  ): Promise<EvaluationScoreSummaryResponse> {
    const form = await this.prisma.evaluationForm.findUnique({
      where: { id },
      select: {
        id: true,
        classId: true,
        status: true,
        isLocked: true,
        classScore: true,
      },
    });

    if (!form) {
      throw new NotFoundException('Không tìm thấy phiếu đánh giá rèn luyện');
    }

    assertNotLocked(form);
    await this.assertReviewerAssigned(
      reviewer.role,
      reviewer.id,
      form.classId,
    );

    if (form.classScore === null) {
      throw new ConflictException(
        'Phiếu chưa có điểm lớp/CVHT đánh giá để xác nhận',
      );
    }

    if (reviewer.role === UserRole.ClassLeader) {
      if (form.status !== FormStatus.submitted) {
        throw new ConflictException(
          'Lớp trưởng chỉ xác nhận được phiếu đang chờ lớp trưởng đánh giá',
        );
      }

      const confirmed = await this.prisma.evaluationForm.update({
        where: { id },
        data: {
          classLeaderReviewedBy: reviewer.id,
          classLeaderReviewedAt: new Date(),
        },
        select: evaluationScoreSummarySelect,
      });

      return mapToScoreSummaryResponse(confirmed);
    }

    if (reviewer.role === UserRole.Advisor) {
      if (form.status !== FormStatus.class_leader_approved) {
        throw new ConflictException(
          'CVHT chỉ xác nhận được phiếu đang chờ CVHT đánh giá',
        );
      }

      const confirmed = await this.prisma.evaluationForm.update({
        where: { id },
        data: {
          rank: calculateClassification(form.classScore),
          classReviewedBy: reviewer.id,
          classReviewedAt: new Date(),
        },
        select: evaluationScoreSummarySelect,
      });

      return mapToScoreSummaryResponse(confirmed);
    }

    throw new ForbiddenException(
      'Vai trò này không có quyền xác nhận phiếu đánh giá',
    );
  }

  /**
   * Duyệt phiếu theo state machine đa cấp:
   * submitted -> class_leader_approved -> class_approved -> faculty_approved -> finalized.
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

    if (reviewer.role === UserRole.ClassLeader) {
      data.classLeaderReviewedBy = reviewer.id;
      data.classLeaderReviewedAt = new Date();
    } else if (reviewer.role === UserRole.Advisor) {
      if (dto.classScore === undefined) {
        throw new BadRequestException(
          'classScore là bắt buộc khi CVHT duyệt phiếu',
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
   * Alias nghiệp vụ riêng cho CVHT trả phiếu về sinh viên kèm lý do.
   * Dùng chung state machine reject để giữ audit, note và notification nhất quán.
   */
  async returnToStudent(
    reviewer: AuthenticatedUser,
    id: string,
    dto: ReturnEvaluationToStudentDto,
  ): Promise<EvaluationScoreSummaryResponse> {
    return this.review(reviewer, id, {
      action: 'reject',
      comment: dto.reason,
    });
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
   * Student chỉ xem phiếu của mình; các vai trò duyệt xem theo quyền được phân công.
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

    if (role === UserRole.Advisor) {
      const assignment = await this.prisma.advisorAssignment.findUnique({
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

    if (role === UserRole.ClassLeader) {
      const assignment = await this.prisma.classLeaderAssignment.findFirst({
        where: { userId: reviewerId, classId },
        select: { id: true },
      });

      if (!assignment) {
        throw new ForbiddenException('Bạn không phải lớp trưởng của lớp này');
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
    facultyIdQuery?: string,
  ): Promise<{ facultyId?: string }> {
    if (user.role === UserRole.Admin) {
      return {};
    }

    if (user.role === UserRole.Faculty) {
      const assignment = await this.prisma.facultyAssignment.findUnique({
        where: { userId: user.id },
        select: { facultyId: true },
      });
      if (!assignment) {
        throw new ForbiddenException('Tài khoản khoa chưa được gán khoa quản lý');
      }
      if (facultyIdQuery && facultyIdQuery !== assignment.facultyId) {
        throw new ForbiddenException('Bạn không có quyền xem dữ liệu của khoa khác');
      }
      return { facultyId: assignment.facultyId };
    }

    if (![UserRole.ClassLeader, UserRole.Advisor].includes(user.role)) {
      throw new ForbiddenException(
        'Bạn không có quyền xem danh sách phiếu này',
      );
    }

    if (!classId) {
      throw new BadRequestException('Vui lòng chọn lớp cần xem');
    }

    await this.assertReviewerAssigned(user.role, user.id, classId);

    return {};
  }
}
