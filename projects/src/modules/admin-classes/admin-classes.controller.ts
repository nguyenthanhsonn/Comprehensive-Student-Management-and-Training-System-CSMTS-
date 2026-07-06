import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddClassStudentDto } from './dto/add-class-student.dto';
import { GetClassStudentsQueryDto } from './dto/get-class-students-query.dto';
import {
  AdminClassesService,
  type UploadedExcelFile,
} from './admin-classes.service';

@Controller('admin/classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin, UserRole.FacultyCouncil)
export class AdminClassesController {
  constructor(private readonly adminClassesService: AdminClassesService) {}

  @Get(':classId/students')
  findStudents(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: GetClassStudentsQueryDto,
  ) {
    return this.adminClassesService.findStudents(userId, role, classId, query);
  }

  @Post(':classId/students')
  addStudent(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: AddClassStudentDto,
  ) {
    return this.adminClassesService.addStudent(userId, role, classId, dto);
  }

  @Delete(':classId/students/:studentId')
  removeStudent(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.adminClassesService.removeStudent(
      userId,
      role,
      classId,
      studentId,
    );
  }

  @Post(':classId/students/import')
  @UseInterceptors(FileInterceptor('file'))
  importStudents(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('classId', ParseUUIDPipe) classId: string,
    @UploadedFile() file: UploadedExcelFile | undefined,
  ) {
    return this.adminClassesService.importStudents(userId, role, classId, file);
  }

}

@Controller('admin/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin, UserRole.FacultyCouncil)
export class AdminStudentsController {
  constructor(private readonly adminClassesService: AdminClassesService) {}

  @Get('import-template')
  async downloadImportTemplate(@Res() res: Response) {
    const buffer = await this.adminClassesService.generateImportTemplate();

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename=mau_import_sinh_vien.xlsx',
    });
    res.send(buffer);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importStudents(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @UploadedFile() file: UploadedExcelFile | undefined,
  ) {
    return this.adminClassesService.importStudentsFromTemplate(
      userId,
      role,
      file,
    );
  }
}
