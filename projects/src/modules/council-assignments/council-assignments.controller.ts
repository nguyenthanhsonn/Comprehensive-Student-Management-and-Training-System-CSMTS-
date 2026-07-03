import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from 'src/common/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CouncilAssignmentsService } from './council-assignments.service';
import { CreateClassCouncilAssignmentDto } from './dto/create-class-council-assignment.dto';
import { CreateFacultyCouncilAssignmentDto } from './dto/create-faculty-council-assignment.dto';

/**
 * Quản lý phân công ai (class_council/faculty_council) phụ trách duyệt điểm
 * cho lớp/khoa nào — điều kiện tiên quyết để luồng duyệt điểm (review) hoạt động.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class CouncilAssignmentsController {
  constructor(
    private readonly councilAssignmentsService: CouncilAssignmentsService,
  ) {}

  @Post('class-council-assignments')
  assignClassCouncil(@Body() dto: CreateClassCouncilAssignmentDto) {
    return this.councilAssignmentsService.assignClassCouncil(dto);
  }

  @Delete('class-council-assignments/:id')
  removeClassCouncil(@Param('id', ParseUUIDPipe) id: string) {
    return this.councilAssignmentsService.removeClassCouncil(id);
  }

  @Post('faculty-council-assignments')
  assignFacultyCouncil(@Body() dto: CreateFacultyCouncilAssignmentDto) {
    return this.councilAssignmentsService.assignFacultyCouncil(dto);
  }

  @Delete('faculty-council-assignments/:id')
  removeFacultyCouncil(@Param('id', ParseUUIDPipe) id: string) {
    return this.councilAssignmentsService.removeFacultyCouncil(id);
  }
}
