import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from 'src/common/shared';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

/** Query cho GET /admin/users — phân trang, tìm kiếm, lọc theo role/trạng thái khóa. */
export class QueryAdminUserDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  isLocked?: boolean;
}
