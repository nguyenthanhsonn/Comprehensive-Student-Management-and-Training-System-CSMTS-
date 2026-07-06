/**
 * Message tiếng Việt dùng chung cho các API quản lý tài khoản/hồ sơ sinh viên (admin).
 * Tập trung tại 1 nơi để dễ tái sử dụng và đảm bảo nhất quán giữa các module.
 */
export const ADMIN_MESSAGES = {
  // Lỗi
  USER_NOT_FOUND: 'Không tìm thấy tài khoản',
  EMAIL_EXISTS: 'Email đã tồn tại',
  STUDENT_NOT_FOUND: 'Không tìm thấy hồ sơ sinh viên',
  STUDENT_CODE_EXISTS: 'Mã sinh viên đã tồn tại',
  USER_ALREADY_HAS_STUDENT_PROFILE: 'Tài khoản này đã có hồ sơ sinh viên',
  FORBIDDEN_ACTION: 'Bạn không có quyền thực hiện thao tác này',
  USER_ALREADY_LOCKED: 'Tài khoản đã bị khóa',
  USER_NOT_LOCKED: 'Tài khoản chưa bị khóa',
  USER_MUST_BE_STUDENT_ROLE:
    'Tài khoản phải có vai trò sinh viên mới được tạo hồ sơ sinh viên',
  CANNOT_CHANGE_OWN_ROLE: 'Bạn không thể tự thay đổi vai trò của chính mình',
  CLASS_NOT_FOUND: 'Không tìm thấy lớp học',
  FACULTY_NOT_FOUND: 'Không tìm thấy khoa',
  MAJOR_NOT_FOUND: 'Không tìm thấy ngành học',

  // Thành công — Users
  CREATE_USER_SUCCESS: 'Tạo tài khoản thành công',
  UPDATE_USER_SUCCESS: 'Cập nhật tài khoản thành công',
  DELETE_USER_SUCCESS: 'Xóa tài khoản thành công',
  LOCK_USER_SUCCESS: 'Khóa tài khoản thành công',
  UNLOCK_USER_SUCCESS: 'Mở khóa tài khoản thành công',
  UPDATE_ROLE_SUCCESS: 'Cập nhật vai trò thành công',
  GET_USERS_SUCCESS: 'Lấy danh sách tài khoản thành công',
  GET_USER_SUCCESS: 'Lấy chi tiết tài khoản thành công',

  // Thành công — Students
  CREATE_STUDENT_SUCCESS: 'Tạo hồ sơ sinh viên thành công',
  UPDATE_STUDENT_SUCCESS: 'Cập nhật hồ sơ sinh viên thành công',
  DELETE_STUDENT_SUCCESS: 'Xóa hồ sơ sinh viên thành công',
  GET_STUDENTS_SUCCESS: 'Lấy danh sách sinh viên thành công',
  GET_STUDENT_SUCCESS: 'Lấy chi tiết sinh viên thành công',
} as const;
