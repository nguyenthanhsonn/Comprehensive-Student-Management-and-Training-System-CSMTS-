export type AdminFacultyResponse = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  majorCount: number;
  assignmentCount: number;
};
