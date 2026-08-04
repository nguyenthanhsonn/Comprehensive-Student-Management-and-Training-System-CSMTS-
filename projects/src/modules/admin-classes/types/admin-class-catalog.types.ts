export type AdminClassResponse = {
  id: string;
  code: string;
  name: string;
  enrollmentYear: number;
  isActive: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  major: {
    id: string;
    code: string;
    name: string;
  };
  faculty: {
    id: string;
    code: string;
    name: string;
  };
  studentCount: number;
};

export type AdminClassDetailResponse = AdminClassResponse & {
  classLeaders: Array<{
    id: string;
    userId: string;
    username: string;
    fullName: string;
    email: string;
    isActive: boolean;
    assignedAt: Date;
  }>;
};
