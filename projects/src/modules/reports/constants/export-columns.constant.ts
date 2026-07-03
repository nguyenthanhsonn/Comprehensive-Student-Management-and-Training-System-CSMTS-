import type { FlatExportRow } from '../types/report.types';

export type ExportColumn = {
  header: string;
  key: keyof FlatExportRow;
  width: number;
};

/** Định nghĩa cột dùng chung cho cả file Excel và PDF xuất ra. */
export const EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Họ và tên', key: 'fullName', width: 25 },
  { header: 'Email', key: 'email', width: 28 },
  { header: 'Lớp', key: 'className', width: 15 },
  { header: 'Khoa', key: 'facultyName', width: 22 },
  { header: 'Học kỳ', key: 'semester', width: 10 },
  { header: 'Năm học', key: 'academicYear', width: 12 },
  { header: 'Điểm SV tự chấm', key: 'studentScore', width: 14 },
  { header: 'Điểm lớp chấm', key: 'classScore', width: 14 },
  { header: 'Điểm chính thức', key: 'finalScore', width: 14 },
  { header: 'Xếp loại', key: 'classification', width: 12 },
  { header: 'Trạng thái', key: 'statusLabel', width: 16 },
];
