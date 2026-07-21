import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class BulkFinalizeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500, { message: 'Chỉ được phê duyệt tối đa 500 phiếu mỗi lần' })
  @IsUUID('4', { each: true })
  ids: string[];
}
