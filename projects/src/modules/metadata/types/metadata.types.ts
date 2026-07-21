/** Dòng dữ liệu combobox chuẩn cho các bảng có UUID thật (khoa, ngành, lớp). */
export type MetadataItem = {
  id: string;
  code: string;
  name: string;
};

/** Lựa chọn học kỳ/năm học — dữ liệu suy ra, không có UUID nên không có `id`. */
export type SemesterOption = {
  code: string;
  name: string;
};
