/// <reference types="jest" />

import { BadRequestException } from '@nestjs/common';
import { FormStatus } from '../../generated/prisma/client';
import { AdminTrainingEvaluationsService } from './admin-training-evaluations.service';

describe('AdminTrainingEvaluationsService', () => {
  const adminId = '48883133-002c-478f-8ede-b93bab87971d';

  function createService() {
    const prisma = {
      evaluationForm: {
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn((args: unknown) => args),
      },
      $transaction: jest.fn((operations: unknown[]) =>
        Promise.resolve(operations),
      ),
    };

    return {
      prisma,
      service: new AdminTrainingEvaluationsService(prisma as never),
    };
  }

  it('returns admin approval list without extra review stats or student score', async () => {
    const { prisma, service } = createService();
    prisma.evaluationForm.findMany.mockResolvedValueOnce([
      {
        id: 'safe',
        status: FormStatus.class_approved,
        submittedAt: null,
        classScore: 73,
        rank: 'good',
        student: {
          id: 'student',
          fullName: 'Student',
          email: 'student@example.com',
        },
        class: {
          id: 'class',
          code: 'CLS',
          name: 'Class',
          major: {
            faculty: { id: 'faculty', code: 'FAC', name: 'Faculty' },
          },
        },
        semester: { year: 2026, semester: 'SEMESTER_2', isActive: true },
      },
    ]);
    prisma.evaluationForm.count.mockResolvedValueOnce(1);

    const result = await service.findAll({
      page: 1,
      limit: 20,
    });

    expect(result).toMatchObject({ page: 1, limit: 20, total: 1 });
    expect(result).not.toHaveProperty('stats');
    expect(result.items[0]).toMatchObject({ classScore: 73, rank: 'good' });
    expect(result.items[0]).not.toHaveProperty('stats');
    expect(result.items[0]).not.toHaveProperty('studentScore');
  });

  it('bulk finalizes valid forms and skips ids that are missing or not class approved', async () => {
    const { prisma, service } = createService();
    prisma.evaluationForm.findMany.mockResolvedValueOnce([
      { id: 'valid', classScore: 80 },
    ]);

    const result = await service.bulkFinalize(adminId, {
      ids: [
        'd5052f8b-a47c-4c6f-81fa-c94c2f785276',
        '00000000-0000-4000-8000-000000000000',
      ],
    });

    expect(result).toMatchObject({ approvedCount: 1, skippedCount: 1 });
    expect(prisma.evaluationForm.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [
            'd5052f8b-a47c-4c6f-81fa-c94c2f785276',
            '00000000-0000-4000-8000-000000000000',
          ],
        },
        status: FormStatus.class_approved,
      },
      select: { id: true, classScore: true },
    });
  });

  it('finalizeByFilter finalizes all candidates that match filters', async () => {
    const { prisma, service } = createService();
    prisma.evaluationForm.findMany.mockResolvedValueOnce([
      { id: 'first', classScore: 72 },
      { id: 'second', classScore: 70 },
    ]);

    const result = await service.finalizeByFilter(adminId, {});

    expect(result).toMatchObject({
      approvedCount: 2,
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([
      expect.objectContaining({
        where: { id: 'first' },
        data: expect.objectContaining({ status: FormStatus.finalized }),
      }),
      expect.objectContaining({
        where: { id: 'second' },
        data: expect.objectContaining({ status: FormStatus.finalized }),
      }),
    ]);
  });

  it('finalizeByFilter is idempotent when no class approved forms match', async () => {
    const { prisma, service } = createService();
    prisma.evaluationForm.findMany.mockResolvedValueOnce([]);

    const result = await service.finalizeByFilter(adminId, {});

    expect(result).toEqual({
      message: 'Không có phiếu nào phù hợp để phê duyệt',
      approvedCount: 0,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires confirmation before finalizing more than 500 forms by filter', async () => {
    const { prisma, service } = createService();
    prisma.evaluationForm.findMany.mockResolvedValueOnce(
      Array.from({ length: 501 }, (_, index) => ({
        id: `form-${index}`,
        classScore: 80,
      })),
    );

    await expect(service.finalizeByFilter(adminId, {})).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
