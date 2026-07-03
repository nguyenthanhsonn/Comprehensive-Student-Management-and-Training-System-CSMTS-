export type EvidenceResponse = {
  id: string;
  studentId: string;
  evaluationFormId: string;
  criterionId: string;
  criterion: {
    id: string;
    code: string;
    title: string;
  };
  imageUrl: string;
  publicId: string | null;
};
