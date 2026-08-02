import type {
  AdminClassCatalogDetailRecord,
  AdminClassCatalogRecord,
} from '../selects/admin-class-catalog.select';
import type {
  AdminClassDetailResponse,
  AdminClassResponse,
} from '../types/admin-class-catalog.types';

/** Chuẩn hóa record Class từ Prisma sang response cho Admin UI. */
export function mapToAdminClassResponse(
  record: AdminClassCatalogRecord,
): AdminClassResponse {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    enrollmentYear: record.enrollmentYear,
    isActive: record.isActive,
    createdAt: record.createdAt,
    deletedAt: record.deletedAt,
    major: record.major,
    faculty: record.major.faculty,
    studentCount: record._count.classStudents,
  };
}

export function mapToAdminClassDetailResponse(
  record: AdminClassCatalogDetailRecord,
): AdminClassDetailResponse {
  return {
    ...mapToAdminClassResponse(record),
    classLeaders: record.classLeaderAssignments.map((assignment) => ({
      id: assignment.id,
      userId: assignment.userId,
      username: assignment.user.username,
      fullName: assignment.user.fullName,
      email: assignment.user.email,
      isActive: assignment.user.isActive,
      assignedAt: assignment.assignedAt,
    })),
    advisors: record.advisorAssignments.map((assignment) => ({
      id: assignment.id,
      userId: assignment.userId,
      username: assignment.user.username,
      fullName: assignment.user.fullName,
      email: assignment.user.email,
      isActive: assignment.user.isActive,
      assignedAt: assignment.assignedAt,
    })),
  };
}

/** Chuẩn hóa mã lớp - trim và viết hoa để tránh trùng do khác biệt hoa/thường. */
export function normalizeClassCode(code: string): string {
  return code.trim().toUpperCase();
}
