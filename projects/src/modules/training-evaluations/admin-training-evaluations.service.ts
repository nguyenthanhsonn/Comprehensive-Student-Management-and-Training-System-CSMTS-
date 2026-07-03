import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResult } from 'src/common/shared';
import { FormStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AdminListEvaluationsQueryDto } from './dto/admin-list-evaluations-query.dto';
import {
  mapToAdminListItem,
  mapToDetailResponse,
} from './helpers/evaluation.mapper';
import { resolveSemesterId } from './helpers/semester.helper';
import {
  evaluationAdminListSelect,
  evaluationDetailSelect,
} from './selects/evaluation-form.select';
import type {
  EvaluationAdminListItem,
  EvaluationDetailResponse,
} from './types/evaluation-form.types';

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
  ): Promise<PaginatedResult<EvaluationAdminListItem>> {
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
      items: evaluations.map(mapToAdminListItem),
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
        classReviewedBy: null,
        classReviewedAt: null,
        facultyReviewedBy: null,
        facultyReviewedAt: null,
        adminFinalizedBy: null,
        adminFinalizedAt: null,
      },
      select: evaluationDetailSelect,
    });

    return mapToDetailResponse(evaluation);
  }
}
