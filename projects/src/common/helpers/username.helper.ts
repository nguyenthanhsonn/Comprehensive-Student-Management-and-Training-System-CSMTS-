/** Quy tắc định dạng username hợp lệ - chữ thường, số, chấm, gạch dưới, gạch ngang, 3-50 ký tự. */
export const USERNAME_PATTERN = /^[a-z0-9._-]+$/;

export const USERNAME_FORMAT_MESSAGE =
  'Tên đăng nhập chỉ được chứa chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang, không chứa khoảng trắng';

/**
 * Chuẩn hóa username: trim khoảng trắng thừa và chuyển về chữ thường.
 * Dùng chung khi tạo/cập nhật tài khoản và khi đăng nhập để tránh trùng
 * do khác biệt hoa/thường (VD: "Admin01" và "admin01" phải là cùng 1 tài khoản).
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
