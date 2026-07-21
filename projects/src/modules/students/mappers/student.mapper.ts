import type { StudentProfileRecord } from '../selects/student.select';
import { formatDateOnly } from '../../../common/helpers/date-only.helper';

export function mapStudentProfile(student: StudentProfileRecord) {
  const currentEnrollment = student.classStudents[0] ?? null;
  const currentClass = currentEnrollment?.class ?? null;
  const currentMajor = currentClass?.major ?? null;
  const currentFaculty = currentMajor?.faculty ?? null;

  return {
    user: {
      id: student.id,
      email: student.email,
      fullName: student.fullName,
      role: student.role,
      isActive: student.isActive,
      studentCode: currentEnrollment?.studentCode ?? null,
    },
    phone: student.phone,
    dateOfBirth: formatDateOnly(student.dateOfBirth),
    studentCode: currentEnrollment?.studentCode ?? null,
    enrolledAt: currentEnrollment?.enrolledAt ?? null,
    class: currentClass
      ? {
          id: currentClass.id,
          code: currentClass.code,
          name: currentClass.name,
          enrollmentYear: currentClass.enrollmentYear,
        }
      : null,
    major: currentMajor
      ? {
          id: currentMajor.id,
          code: currentMajor.code,
          name: currentMajor.name,
        }
      : null,
    faculty: currentFaculty
      ? {
          id: currentFaculty.id,
          code: currentFaculty.code,
          name: currentFaculty.name,
        }
      : null,
  };
}

export type StudentProfile = ReturnType<typeof mapStudentProfile>;
