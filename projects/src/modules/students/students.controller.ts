import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UserRole } from 'src/common/shared';
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
  getProfileStudent(@Req() req: RequestWithUser) {
    return this.studentsService.getProfileStudent(req.user.id);
  }

  @Patch('me')
  updateProfile(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateStudentContactDto,
  ) {
    return this.studentsService.updateProfile(req.user.id, dto);
  }

  @Get('me/evaluations')
  getMyEvaluations(@Req() request: RequestWithUser) {
    return this.studentsService.getMyEvaluations(request.user);
  }
}
