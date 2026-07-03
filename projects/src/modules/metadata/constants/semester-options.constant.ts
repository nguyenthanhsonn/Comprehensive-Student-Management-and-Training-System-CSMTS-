import type { SemesterOption } from '../types/metadata.types';

/**
 * Danh sách cố định 3 loại học kỳ (HK1/HK2/Hè) dùng cho combobox.
 * Đây là dữ liệu tĩnh, không truy vấn DB — bảng `semesters` không có cột
 * code/name, chỉ lưu (năm, loại học kỳ), nên FE chỉ cần chọn loại học kỳ này.
 */
export const SEMESTER_OPTIONS: SemesterOption[] = [
  { code: 'HK1', name: 'Học kỳ 1' },
  { code: 'HK2', name: 'Học kỳ 2' },
  { code: 'SUMMER', name: 'Học kỳ hè' },
];
