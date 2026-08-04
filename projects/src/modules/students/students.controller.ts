import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UserRole } from 'src/common/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/types/authenticated-user.type';
import { UpdateStudentContactDto } from './dto/update-student-contact.dto';
import { StudentsService } from './students.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Students')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Student)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET me trong nhóm Students; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('me')
  getProfileStudent(@Req() req: RequestWithUser) {
    return this.studentsService.getProfileStudent(req.user.id);
  }

  @ApiOperation({
    summary: 'Cập nhật dữ liệu',
    description: 'Endpoint PATCH me trong nhóm Students; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Patch('me')
  updateProfile(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateStudentContactDto,
  ) {
    return this.studentsService.updateProfile(req.user.id, dto);
  }

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET me/evaluations trong nhóm Students; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('me/evaluations')
  getMyEvaluations(@Req() request: RequestWithUser) {
    return this.studentsService.getMyEvaluations(request.user);
  }
}
