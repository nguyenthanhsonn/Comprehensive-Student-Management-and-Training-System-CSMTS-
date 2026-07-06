/** Response hồ sơ sinh viên — không chứa passwordHash của user. */
export type AdminStudentItem = {
  id: string;
  studentCode: string;
  fullName: string;
  phone: string | null;
  admissionYear: number;
  user: {
    id: string;
    email: string;
    isLocked: boolean;
  };
  class: {
    id: string;
    className: string;
  };
  faculty: {
    id: string;
    facultyName: string;
  };
  major: {
    id: string;
    majorName: string;
  };
};
