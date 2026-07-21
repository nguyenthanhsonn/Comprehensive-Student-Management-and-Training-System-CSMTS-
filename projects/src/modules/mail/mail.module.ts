import { Module } from '@nestjs/common';
import { StudentAccountMailService } from './student-account-mail.service';

@Module({
  providers: [StudentAccountMailService],
  exports: [StudentAccountMailService],
})
export class MailModule {}
