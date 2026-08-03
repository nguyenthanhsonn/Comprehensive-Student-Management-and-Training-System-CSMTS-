import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class UpdateClassLeadersDto {
  @IsArray({ message: 'Danh sách lớp trưởng phải là một mảng' })
  @ArrayUnique({ message: 'Danh sách lớp trưởng không được trùng lặp' })
  @IsUUID('4', { each: true, message: 'Mã lớp trưởng phải là UUID hợp lệ' })
  userIds: string[];
}
