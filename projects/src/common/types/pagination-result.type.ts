/** Thông tin phân trang trả về cho client (số trang, giới hạn, tổng số bản ghi). */
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/**
 * Kết quả phân trang chuẩn dùng cho mọi API danh sách.
 * `ResponseInterceptor` sẽ tự nhận diện shape này (có `items` + `meta`) và tách
 * `meta` ra ngoài cùng cấp với `data` theo đúng format response của hệ thống.
 */
export type PaginatedResult<T> = {
  items: T[];
  meta: PaginationMeta;
};
