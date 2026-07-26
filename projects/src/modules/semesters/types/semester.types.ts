import type { ApiSemester } from './api-semester.type';

export type SemesterResponse = {
  id: string;
  year: number;
  academicYear: string;
  semester: ApiSemester;
  semesterName: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  studentDeadline: Date | null;
  classDeadline: Date | null;
  facultyDeadline: Date | null;
  isActive: boolean;
};

export type EvaluationPopupResponse = {
  visible: boolean;
  title: string | null;
  content: string | null;
  semesterId: string | null;
  startDate: string | null;
  endDate: string | null;
};
