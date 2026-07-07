import { IsBoolean } from 'class-validator';

/** Body cho PATCH /admin/users/:id/lock - locked=true để khóa, false để mở khóa. */
export class LockAdminUserDto {
  @IsBoolean()
  locked: boolean;
}
