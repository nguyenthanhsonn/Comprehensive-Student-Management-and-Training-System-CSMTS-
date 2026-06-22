import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@smaste/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/types/authenticated-user.type';
import { UpdateStudentContactDto } from './dto/update-student-contact.dto';
import { StudentsService } from './students.service';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Student)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('me')
  getMe(@Req() request: RequestWithUser) {
    return this.studentsService.getMe(request.user);
  }

  @Patch('me')
  updateMyContact(
    @Req() request: RequestWithUser,
    @Body() dto: UpdateStudentContactDto,
  ) {
    return this.studentsService.updateMyContact(request.user, dto);
  }

  @Get('me/evaluations')
  getMyEvaluations(@Req() request: RequestWithUser) {
    return this.studentsService.getMyEvaluations(request.user);
  }
}
