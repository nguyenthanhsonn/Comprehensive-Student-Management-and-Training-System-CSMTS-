import type { EvidenceRecord } from '../selects/evidence.select';
import type { EvidenceResponse } from '../types/evidence.types';

export function mapToEvidenceResponse(
  evidence: EvidenceRecord,
): EvidenceResponse {
  return {
    id: evidence.id,
    studentId: evidence.studentId,
    evaluationFormId: evidence.evaluationFormId,
    criterionId: evidence.criterionId,
    criterion: evidence.criterion,
    imageUrl: evidence.imageUrl,
    publicId: evidence.publicId,
  };
}
