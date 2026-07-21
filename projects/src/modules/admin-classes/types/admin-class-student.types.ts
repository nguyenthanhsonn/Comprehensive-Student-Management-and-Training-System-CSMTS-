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
  createdAccountCount: number;
  createdAccounts: Array<{
    username: string;
    email: string;
    password: string;
    studentCode: string;
    fullName: string;
  }>;
  emailSentCount: number;
  emailFailedCount: number;
  emailErrors: Array<{
    email: string;
    message: string;
  }>;
  failedCount: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
};

export type ImportClassStudentPreviewItem = {
  row: number;
  action: 'create' | 'enroll' | 'skip';
  studentId: string | null;
  studentCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  username: string;
  password: string | null;
  classId: string;
  classCode: string;
  className: string;
  note: string | null;
};

export type ImportClassStudentsPreviewResponse = {
  importToken: string;
  expiresAt: Date;
  totalRows: number;
  successCount: number;
  skippedCount: number;
  createdAccountCount: number;
  createdAccounts: Array<{
    username: string;
    email: string;
    password: string;
    studentCode: string;
    fullName: string;
  }>;
  previewStudents: ImportClassStudentPreviewItem[];
  failedCount: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
};
