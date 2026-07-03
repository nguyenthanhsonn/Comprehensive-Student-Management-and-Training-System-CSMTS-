import { Injectable, NotFoundException } from '@nestjs/common';
import { FormStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  assertEditable,
  assertNotLocked,
} from '../training-evaluations/helpers/score.calculator';
import { LinkEvidenceUrlDto } from './dto/link-evidence-url.dto';
import { mapToEvidenceResponse } from './mappers/evidence.mapper';
import {
  evidenceSelect,
  type EvidenceRecord,
} from './selects/evidence.select';
import type { EvidenceResponse } from './types/evidence.types';

@Injectable()
export class EvidencesService {
  constructor(private readonly prisma: PrismaService) {}

  async linkUrl(
    userId: string,
    dto: LinkEvidenceUrlDto,
  ): Promise<EvidenceResponse> {
    const form = await this.findLatestWritableForm(userId);
    const criterion = await this.findActiveCriterionByCode(dto.criteriaCode);

    const evidence = await this.prisma.evidence.create({
      data: {
        studentId: userId,
        evaluationFormId: form.id,
        criterionId: criterion.id,
        imageUrl: dto.imageUrl,
        publicId: dto.publicId ?? null,
      },
      select: evidenceSelect,
    });

    return mapToEvidenceResponse(evidence);
  }

  async findMine(userId: string): Promise<EvidenceResponse[]> {
    const evidences = await this.prisma.evidence.findMany({
      where: { studentId: userId },
      select: evidenceSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return evidences.map(mapToEvidenceResponse);
  }

  async remove(userId: string, id: string): Promise<EvidenceResponse> {
    const evidence = await this.findOwned(userId, id);
    assertNotLocked(evidence.evaluationForm);
    assertEditable(evidence.evaluationForm.status);

    const deleted = await this.prisma.evidence.delete({
      where: { id },
      select: evidenceSelect,
    });

    return mapToEvidenceResponse(deleted);
  }

  private async findLatestWritableForm(
    userId: string,
  ): Promise<{ id: string; status: FormStatus; isLocked: boolean }> {
    const form = await this.prisma.evaluationForm.findFirst({
      where: { studentId: userId },
      select: { id: true, status: true, isLocked: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    if (!form) {
      throw new NotFoundException('Không tìm thấy phiếu đánh giá rèn luyện');
    }

    assertNotLocked(form);
    assertEditable(form.status);

    return form;
  }

  private async findActiveCriterionByCode(
    criteriaCode: string,
  ): Promise<{ id: string }> {
    const criterion = await this.prisma.evaluationCriteria.findFirst({
      where: { code: criteriaCode, isActive: true },
      select: { id: true },
    });

    if (!criterion) {
      throw new NotFoundException('Không tìm thấy tiêu chí đánh giá');
    }

    return criterion;
  }

  private async findOwned(userId: string, id: string): Promise<
    EvidenceRecord & {
      evaluationForm: { status: FormStatus; isLocked: boolean };
    }
  > {
    const evidence = await this.prisma.evidence.findFirst({
      where: { id, studentId: userId },
      select: {
        ...evidenceSelect,
        evaluationForm: { select: { status: true, isLocked: true } },
      },
    });

    if (!evidence) {
      throw new NotFoundException('Không tìm thấy minh chứng');
    }

    return evidence;
  }
}
