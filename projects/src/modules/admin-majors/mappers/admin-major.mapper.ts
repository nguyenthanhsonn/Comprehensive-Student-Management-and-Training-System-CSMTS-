import type { AdminMajorRecord } from '../selects/admin-major.select';
import type { AdminMajorResponse } from '../types/admin-major.types';

/** Chuẩn hóa record Major từ Prisma sang response cho Admin UI. */
export function mapToAdminMajorResponse(
  record: AdminMajorRecord,
): AdminMajorResponse {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    facultyId: record.facultyId,
    isActive: record.isActive,
    createdAt: record.createdAt,
    deletedAt: record.deletedAt,
    faculty: record.faculty,
    classCount: record._count.classes,
  };
}

/** Chuẩn hóa mã ngành - trim và viết hoa để tránh trùng do khác biệt hoa/thường. */
export function normalizeMajorCode(code: string): string {
  return code.trim().toUpperCase();
}
