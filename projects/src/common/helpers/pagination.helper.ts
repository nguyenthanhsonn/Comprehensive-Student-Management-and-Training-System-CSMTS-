import type { PaginatedResult } from '../types/pagination-result.type';

/** Tính số bản ghi cần bỏ qua (OFFSET) dựa trên page/limit. */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/** Đóng gói danh sách kèm thông tin phân trang (meta) theo format chuẩn của hệ thống. */
export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
