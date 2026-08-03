import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResult } from 'src/common/shared';
import { FormStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AdminListEvaluationsQueryDto } from './dto/admin-list-evaluations-query.dto';
import { BulkFinalizeDto } from './dto/bulk-finalize.dto';
import { FinalizeByFilterDto } from './dto/finalize-by-filter.dto';
import { FinalizeEvaluationDto } from './dto/finalize-evaluation.dto';
import {
  mapToAdminApprovalListItem,
  mapToDetailResponse,
  mapToScoreSummaryResponse,
} from './helpers/evaluation.mapper';
import { calculateClassification } from './helpers/score.calculator';
import { resolveSemesterId } from './helpers/semester.helper';
import {
  evaluationAdminApprovalListSelect,
  evaluationDetailSelect,
  evaluationScoreSummarySelect,
} from './selects/evaluation-form.select';
import type {
  EvaluationAdminApprovalListItem,
  EvaluationDetailResponse,
  EvaluationScoreSummaryResponse,
} from './types/evaluation-form.types';

const BULK_FINALIZE_LIMIT = 500;

type FinalizeBatchResult = {
  message: string;
  approvedCount: number;
  skippedCount?: number;
};

@Injectable()
export class AdminTrainingEvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách toàn bộ phiếu đánh giá trong hệ thống, có phân trang và bộ lọc nâng cao
   * (lớp, khoa, trạng thái, học kỳ, từ khóa tên/email sinh viên).
   * Không giới hạn theo sinh viên như phía client — admin xem được mọi phiếu.
   */
  async findAll(
    query: AdminListEvaluationsQueryDto,
  ): Promise<PaginatedResult<EvaluationAdminApprovalListItem>> {
    const semesterId =
      query.semesterId ??
      (await resolveSemesterId(
        this.prisma,
        query.semester,
        query.academicYear,
      ));
    const search = query.search?.trim() || query.keyword?.trim();

    const where: Prisma.EvaluationFormWhereInput = {
      status: query.status ?? FormStatus.faculty_approved,
      ...(query.classId && { classId: query.classId }),
      ...(query.facultyId && {
        class: { major: { facultyId: query.facultyId } },
      }),
      ...(semesterId && { semesterId }),
      ...(search && {
        student: {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            {
              classStudents: {
                some: {
                  studentCode: { contains: search, mode: 'insensitive' },
                },
              },
            },
          ],
        },
      }),
    };

    const [evaluations, total] = await Promise.all([
      this.prisma.evaluationForm.findMany({
        where,
        relationLoadStrategy: 'join',
        select: evaluationAdminApprovalListSelect,
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.evaluationForm.count({ where }),
    ]);

    return {
      items: evaluations.map(mapToAdminApprovalListItem),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * Mở lại phiếu đánh giá: chuyển trạng thái về draft để sinh viên chỉnh sửa lại từ đầu.
   * Giữ nguyên điểm 5 mục đã chấm (study/discipline/activity/community/role) vì đây vẫn
   * là dữ liệu hợp lệ của sinh viên; chỉ reset các trường thuộc vòng duyệt (điểm lớp,
   * điểm cuối, người/thời điểm duyệt ở từng cấp) vì vòng duyệt cũ không còn hiệu lực.
   *
   * @throws NotFoundException nếu phiếu không tồn tại
   * @throws ConflictException nếu phiếu đang ở trạng thái draft (mở lại vô nghĩa)
   */
  async reopen(id: string): Promise<EvaluationDetailResponse> {
    const current = await this.prisma.evaluationForm.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!current) {
      throw new NotFoundException('Không tìm thấy phiếu đánh giá');
    }

    if (current.status === FormStatus.draft) {
      throw new ConflictException('Phiếu đang ở trạng thái nháp, không cần mở lại');
    }

    const evaluation = await this.prisma.evaluationForm.update({
      where: { id },
      data: {
        status: FormStatus.draft,
        submittedAt: null,
        classScore: null,
        finalScore: null,
        classLeaderReviewedBy: null,
        classLeaderReviewedAt: null,
        classReviewedBy: null,
        classReviewedAt: null,
        adminFinalizedBy: null,
        adminFinalizedAt: null,
      },
      select: evaluationDetailSelect,
    });

    return mapToDetailResponse(evaluation);
  }

  async finalize(
    adminId: string,
    id: string,
    dto: FinalizeEvaluationDto,
  ): Promise<EvaluationScoreSummaryResponse> {
    const current = await this.prisma.evaluationForm.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        classScore: true,
        isLocked: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Không tìm thấy phiếu đánh giá');
    }

    if (current.isLocked) {
      throw new ConflictException('Biểu mẫu rèn luyện đã bị khóa vĩnh viễn!');
    }

    if (current.status !== FormStatus.faculty_approved) {
      throw new ConflictException(
        'Phiếu chưa được khoa gửi lên Phòng Đào tạo, không thể phê duyệt cuối',
      );
    }

    const finalScore = dto.finalScore ?? current.classScore;
    if (finalScore === null) {
      throw new ConflictException(
        'Phiếu chưa có điểm lớp chấm, không thể phê duyệt cuối',
      );
    }

    const evaluation = await this.prisma.evaluationForm.update({
      where: { id },
      data: {
        status: FormStatus.finalized,
        finalScore,
        rank: calculateClassification(finalScore),
        adminFinalizedBy: adminId,
        adminFinalizedAt: new Date(),
      },
      select: evaluationScoreSummarySelect,
    });

    return mapToScoreSummaryResponse(evaluation);
  }

  async bulkFinalize(
    adminId: string,
    dto: BulkFinalizeDto,
  ): Promise<FinalizeBatchResult> {
    if (dto.ids.length > BULK_FINALIZE_LIMIT) {
      throw new BadRequestException(
        `Chỉ được phê duyệt tối đa ${BULK_FINALIZE_LIMIT} phiếu mỗi lần`,
      );
    }

    const forms = await this.prisma.evaluationForm.findMany({
      where: { id: { in: dto.ids }, status: FormStatus.faculty_approved },
      select: { id: true, classScore: true },
    });

    if (forms.length === 0) {
      throw new BadRequestException(
        'Không có phiếu hợp lệ để phê duyệt (có thể đã được duyệt trước đó)',
      );
    }

    await this.finalizeForms(adminId, forms);

    const skipped = dto.ids.length - forms.length;
    return {
      message: `Đã phê duyệt ${forms.length} phiếu${
        skipped > 0 ? `, bỏ qua ${skipped} phiếu không hợp lệ trạng thái` : ''
      }`,
      approvedCount: forms.length,
      skippedCount: skipped,
    };
  }

  async finalizeByFilter(
    adminId: string,
    dto: FinalizeByFilterDto,
  ): Promise<FinalizeBatchResult> {
    const where: Prisma.EvaluationFormWhereInput = {
      status: FormStatus.faculty_approved,
      ...(dto.semesterId && { semesterId: dto.semesterId }),
      ...(dto.classId && { classId: dto.classId }),
      ...(dto.facultyId && {
        class: { major: { facultyId: dto.facultyId } },
      }),
    };

    const candidates = await this.prisma.evaluationForm.findMany({
      where,
      select: { id: true, classScore: true },
    });

    if (candidates.length === 0) {
      return {
        message: 'Không có phiếu nào phù hợp để phê duyệt',
        approvedCount: 0,
      };
    }

    if (candidates.length > BULK_FINALIZE_LIMIT && !dto.confirmLargeAction) {
      throw new BadRequestException({
        message: `Thao tác này sẽ phê duyệt ${candidates.length} phiếu, vượt ngưỡng an toàn ${BULK_FINALIZE_LIMIT}. Vui lòng xác nhận lại bằng cách gửi confirmLargeAction=true.`,
        count: candidates.length,
      });
    }

    await this.finalizeForms(adminId, candidates);

    return {
      message: `Đã phê duyệt ${candidates.length} phiếu`,
      approvedCount: candidates.length,
    };
  }

  private finalizeForms(
    adminId: string,
    forms: Array<{ id: string; classScore: number | null }>,
  ) {
    const finalizedAt = new Date();
    return this.prisma.$transaction(
      forms.map((form) => {
        const finalScore = form.classScore ?? 0;
        return this.prisma.evaluationForm.update({
          where: { id: form.id },
          data: {
            status: FormStatus.finalized,
            finalScore,
            rank: calculateClassification(finalScore),
            adminFinalizedBy: adminId,
            adminFinalizedAt: finalizedAt,
          },
          select: { id: true },
        });
      }),
    );
  }
}
