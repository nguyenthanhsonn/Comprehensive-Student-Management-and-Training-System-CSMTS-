import type { AdminFacultyRecord } from '../selects/admin-faculty.select';
import type { AdminFacultyResponse } from '../types/admin-faculty.types';

/** Chuẩn hóa record Faculty từ Prisma sang response cho Admin UI. */
export function mapToAdminFacultyResponse(
  record: AdminFacultyRecord,
): AdminFacultyResponse {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    isActive: record.isActive,
    createdAt: record.createdAt,
    deletedAt: record.deletedAt,
    majorCount: record._count.majors,
    assignmentCount: 0,
  };
}

/** Chuẩn hóa mã khoa - trim và viết hoa để tránh trùng do khác biệt hoa/thường. */
export function normalizeFacultyCode(code: string): string {
  return code.trim().toUpperCase();
}
