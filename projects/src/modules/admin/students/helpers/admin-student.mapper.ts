import type { AdminStudentRecord } from '../selects/admin-student.select';
import type { AdminStudentItem } from '../types/admin-student.types';

/** Chuyển record ClassStudent (đã join User/Class/Major/Faculty) sang response hồ sơ sinh viên. */
export function mapToAdminStudentItem(
  record: AdminStudentRecord,
): AdminStudentItem {
  return {
    id: record.id,
    studentCode: record.studentCode,
    fullName: record.student.fullName,
    phone: record.student.phone,
    admissionYear: record.class.enrollmentYear,
    user: {
      id: record.student.id,
      email: record.student.email,
      isLocked: !record.student.isActive,
    },
    class: {
      id: record.class.id,
      className: record.class.name,
    },
    faculty: {
      id: record.class.major.faculty.id,
      facultyName: record.class.major.faculty.name,
    },
    major: {
      id: record.class.major.id,
      majorName: record.class.major.name,
    },
  };
}
