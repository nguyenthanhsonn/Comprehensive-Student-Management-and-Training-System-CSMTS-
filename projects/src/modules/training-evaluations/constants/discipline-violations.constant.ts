// Danh sách mã vi phạm và mức trừ điểm cố định – Mục II, QĐ 4185/QĐ-HCQG
export const DISCIPLINE_VIOLATION_CODES = [
  'MISSED_CITIZEN_WEEK_FULL',      // Không tham gia đầy đủ/bài thu hoạch < 5đ: -10
  'ABSENT_CITIZEN_WEEK_SESSION',   // Nghỉ không lý do 1 buổi tuần SH công dân: -3/buổi
  'ABSENT_CLASS_MEETING',          // Không tham gia sinh hoạt lớp/giao ban: -5/buổi
  'VIOLATED_DRESS_CODE',           // Không đeo thẻ/đồng phục GDTC/hút thuốc...: -5/lần
  'VIOLATED_CAMPUS_RULES',         // Vi phạm quy định khu giảng đường/thư viện/cư trú: -5/lần
  'LATE_FEE_PAYMENT',              // Chậm đóng học phí/lệ phí/hồ sơ: -5/lần
  'EXAM_REPRIMAND',                // Bị khiển trách trong phòng thi: -5/lần
  'EXAM_VIOLATION_WARNING',        // Vi phạm quy chế thi mức cảnh cáo/trừ điểm: -10/lần
  'EXAM_VIOLATION_SUSPENSION',     // Vi phạm quy chế thi bị đình chỉ: -20/lần
] as const;

export type DisciplineViolationCode = (typeof DISCIPLINE_VIOLATION_CODES)[number];

export const DISCIPLINE_DEDUCTION_POINTS: Record<DisciplineViolationCode, number> = {
  MISSED_CITIZEN_WEEK_FULL: 10,
  ABSENT_CITIZEN_WEEK_SESSION: 3,
  ABSENT_CLASS_MEETING: 5,
  VIOLATED_DRESS_CODE: 5,
  VIOLATED_CAMPUS_RULES: 5,
  LATE_FEE_PAYMENT: 5,
  EXAM_REPRIMAND: 5,
  EXAM_VIOLATION_WARNING: 10,
  EXAM_VIOLATION_SUSPENSION: 20,
};
