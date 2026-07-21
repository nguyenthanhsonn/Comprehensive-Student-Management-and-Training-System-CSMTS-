import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { AdminStudentsService } from './admin-students.service';

/**
 * Module này chỉ khai báo service, không có controller riêng: các route CRUD hồ sơ
 * sinh viên được gắn vào AdminStudentsController đã tồn tại sẵn trong admin-classes
 * (cùng phục vụ import/template ở prefix "admin/students") để tránh 2 controller khác
 * nhau cùng đăng ký route trùng prefix, dễ gây xung đột thứ tự match route.
 */
@Module({
  imports: [PrismaModule, AuthModule, MailModule],
  providers: [AdminStudentsService],
  exports: [AdminStudentsService],
})
export class AdminStudentsModule {}
