import { Prisma } from '../../../generated/prisma/client';

export const evidenceSelect = {
  id: true,
  studentId: true,
  evaluationFormId: true,
  criterionId: true,
  imageUrl: true,
  publicId: true,
  criterion: {
    select: {
      id: true,
      code: true,
      title: true,
    },
  },
} satisfies Prisma.EvidenceSelect;

export type EvidenceRecord = Prisma.EvidenceGetPayload<{
  select: typeof evidenceSelect;
}>;
