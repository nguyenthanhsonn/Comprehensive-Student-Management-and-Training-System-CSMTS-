export type AdminClassStudentResponse = {
  id: string;
  classId: string;
  studentId: string;
  studentCode: string;
  email: string;
  fullName: string;
  phone: string | null;
  dateOfBirth: Date | null;
  isActive: boolean;
  enrolledAt: Date;
};

export type ImportClassStudentsResult = {
  totalRows: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
};
