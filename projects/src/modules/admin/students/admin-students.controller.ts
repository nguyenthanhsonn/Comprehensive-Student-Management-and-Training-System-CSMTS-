import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from 'src/common/shared';
import { ADMIN_MESSAGES } from '../../../common/constants/message.constant';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminStudentsService } from './admin-students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

/** Quản lý hồ sơ sinh viên (ClassStudent liên kết User) — chỉ Admin được truy cập. */
@Controller('admin/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminStudentsController {
  constructor(private readonly adminStudentsService: AdminStudentsService) {}

  @Get()
  @ResponseMessage(ADMIN_MESSAGES.GET_STUDENTS_SUCCESS)
  findMany(@Query() query: QueryStudentDto) {
    return this.adminStudentsService.findMany(query);
  }

  @Post()
  @ResponseMessage(ADMIN_MESSAGES.CREATE_STUDENT_SUCCESS)
  create(@Body() dto: CreateStudentDto) {
    return this.adminStudentsService.create(dto);
  }

  @Get(':id')
  @ResponseMessage(ADMIN_MESSAGES.GET_STUDENT_SUCCESS)
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminStudentsService.findById(id);
  }

  @Patch(':id')
  @ResponseMessage(ADMIN_MESSAGES.UPDATE_STUDENT_SUCCESS)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.adminStudentsService.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage(ADMIN_MESSAGES.DELETE_STUDENT_SUCCESS)
  softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminStudentsService.softDelete(id);
  }
}
