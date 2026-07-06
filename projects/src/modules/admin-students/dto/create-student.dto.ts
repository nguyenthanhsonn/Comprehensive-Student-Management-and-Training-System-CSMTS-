import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  normalizeUsername,
  USERNAME_FORMAT_MESSAGE,
  USERNAME_PATTERN,
} from 'src/common/helpers/username.helper';

/**
 * Dữ liệu tạo hồ sơ sinh viên - tạo mới User (role=student), mật khẩu được hash bằng bcrypt.
 * classId/studentCode là tùy chọn nhưng phải đi kèm nhau (validate ở service): nếu truyền
 * classId thì phải có studentCode và ngược lại, khi đó sẽ tạo luôn bản ghi ClassStudent.
 */
export class CreateStudentDto {
  /** Tên đăng nhập - dùng để login, phải là duy nhất trong hệ thống. */
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? normalizeUsername(value) : value,
  )
  @IsString()
  @Length(3, 50)
  @Matches(USERNAME_PATTERN, { message: USERNAME_FORMAT_MESSAGE })
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MaxLength(255)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  studentCode?: string;
}
