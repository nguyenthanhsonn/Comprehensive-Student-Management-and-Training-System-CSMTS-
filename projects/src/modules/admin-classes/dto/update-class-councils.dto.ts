import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class UpdateClassCouncilsDto {
  @IsArray({ message: 'Danh sách cố vấn phải là một mảng' })
  @ArrayUnique({ message: 'Danh sách cố vấn không được trùng lặp' })
  @IsUUID('4', { each: true, message: 'Mã cố vấn phải là UUID hợp lệ' })
  userIds: string[];
}
