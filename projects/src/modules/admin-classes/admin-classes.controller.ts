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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ConfirmImportDto } from '../../common/dto/confirm-import.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminStudentsService } from '../admin-students/admin-students.service';
import { CreateStudentDto } from '../admin-students/dto/create-student.dto';
import { GetAdminStudentsQueryDto } from '../admin-students/dto/get-admin-students-query.dto';
import { UpdateStudentDto } from '../admin-students/dto/update-student.dto';
import { AdminClassCatalogService } from './admin-class-catalog.service';
import type { UploadedClassExcelFile } from './admin-class-catalog.service';
import { AddClassStudentDto } from './dto/add-class-student.dto';
import { ConfirmImportStudentsDto } from './dto/confirm-import-students.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { GetClassesQueryDto } from './dto/get-classes-query.dto';
import { GetClassStudentsQueryDto } from './dto/get-class-students-query.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import {
  AdminClassesService,
  type UploadedExcelFile,
} from './admin-classes.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Classes')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@ApiResponse({
  status: 403,
  description: 'Không đủ quyền xem danh sách sinh viên của lớp này.',
})
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin, UserRole.Advisor, UserRole.ClassLeader, UserRole.Faculty)
export class ClassesController {
  constructor(
    private readonly adminClassesService: AdminClassesService,
    private readonly adminClassCatalogService: AdminClassCatalogService,
  ) {}

  @ApiOperation({
    summary: 'Danh sách sinh viên theo lớp',
    description:
      'Endpoint dùng chung cho admin, CVHT, lớp trưởng và khoa. Quyền truy cập được lọc theo phạm vi của từng role.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get(':classId/students')
  findStudents(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: GetClassStudentsQueryDto,
  ) {
    return this.adminClassesService.findStudents(userId, role, classId, query);
  }

  @ApiOperation({
    summary: 'Chi tiết lớp học',
    description:
      'Endpoint dùng chung cho admin, CVHT, lớp trưởng và khoa. Response giống chi tiết lớp admin, nhưng dữ liệu được lọc theo phạm vi quyền của người gọi.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get(':id')
  findOneClass(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminClassCatalogService.findOneForViewer(userId, role, id);
  }
}

@ApiTags('Admin Classes')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@ApiResponse({ status: 403, description: 'Không đủ quyền truy cập API này.' })
@Controller('admin/classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin, UserRole.Advisor, UserRole.ClassLeader)
export class AdminClassesController {
  constructor(
    private readonly adminClassesService: AdminClassesService,
    private readonly adminClassCatalogService: AdminClassCatalogService,
  ) {}

  // Backward-compatible route cũ; FE nên chuyển sang GET /classes/:classId/students.
  @ApiOperation({
    summary: 'Danh sách sinh viên theo lớp (route cũ)',
    description:
      'Giữ để tương thích với FE cũ. Luồng dùng chung cho admin, CVHT, lớp trưởng và khoa là GET /classes/:classId/students.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get(':classId/students')
  findStudents(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: GetClassStudentsQueryDto,
  ) {
    return this.adminClassesService.findStudents(userId, role, classId, query);
  }

  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description:
      'Endpoint POST :classId/students trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post(':classId/students')
  addStudent(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: AddClassStudentDto,
  ) {
    return this.adminClassesService.addStudent(userId, role, classId, dto);
  }

  @ApiOperation({
    summary: 'Xóa dữ liệu',
    description:
      'Endpoint DELETE :classId/students/:studentId trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
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

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload cho endpoint import.',
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description:
      'Endpoint POST :classId/students/import trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
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

  // ─── CRUD danh mục lớp (Task 4.2) - Admin-only, đặt sau route nested phía trên ──
  // để đảm bảo "/:classId/students*" luôn được match trước route ":id" ở đây.
  // (Về bản chất path đã khác độ sâu nên không thực sự xung đột, nhưng giữ thứ tự
  // này để nhất quán và an toàn tuyệt đối.)

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description:
      'Endpoint GET / trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get()
  @Roles(UserRole.Admin)
  findAllClasses(@Query() query: GetClassesQueryDto) {
    return this.adminClassCatalogService.findAll(query);
  }

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description:
      'Endpoint GET import-template trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('import-template')
  @Roles(UserRole.Admin)
  async downloadClassImportTemplate(@Res() res: Response) {
    const buffer = await this.adminClassCatalogService.generateImportTemplate();

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=mau_import_lop.xlsx',
    });
    res.send(buffer);
  }

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload cho endpoint import.',
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description:
      'Endpoint POST import trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post('import')
  @Roles(UserRole.Admin)
  @UseInterceptors(FileInterceptor('file'))
  importClasses(@UploadedFile() file: UploadedClassExcelFile | undefined) {
    return this.adminClassCatalogService.importFromTemplate(file);
  }

  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description:
      'Endpoint POST import/confirm trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post('import/confirm')
  @Roles(UserRole.Admin)
  confirmImportClasses(@Body() dto: ConfirmImportDto) {
    return this.adminClassCatalogService.confirmImport(dto.importToken);
  }

  // Backward-compatible route cũ; FE nên chuyển sang GET /classes/:id.
  @ApiOperation({
    summary: 'Chi tiết lớp CVHT phụ trách (route cũ)',
    description: 'Giữ để tương thích với FE cũ. Luồng dùng chung là GET /classes/:id.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get(':id')
  @Roles(UserRole.Admin)
  findOneClass(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminClassCatalogService.findOne(id);
  }

  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description:
      'Endpoint POST / trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post()
  @Roles(UserRole.Admin)
  createClass(@Body() dto: CreateClassDto) {
    return this.adminClassCatalogService.create(dto);
  }

  @ApiOperation({
    summary: 'Cập nhật dữ liệu',
    description:
      'Endpoint PATCH :id trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Patch(':id')
  @Roles(UserRole.Admin)
  updateClass(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.adminClassCatalogService.update(id, dto);
  }

  @ApiOperation({
    summary: 'Xóa dữ liệu',
    description:
      'Endpoint DELETE :id trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Delete(':id')
  @Roles(UserRole.Admin)
  removeClass(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminClassCatalogService.remove(id);
  }
}

@ApiTags('Advisor Classes')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@ApiResponse({ status: 403, description: 'Không đủ quyền truy cập API này.' })
@Controller('advisor/classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Advisor)
export class AdvisorClassesController {
  constructor(
    private readonly adminClassCatalogService: AdminClassCatalogService,
  ) {}

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description:
      'Endpoint GET :id trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get(':id')
  findOneManagedClass(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminClassCatalogService.findOneForAdvisor(userId, id);
  }
}

@ApiTags('Admin Students')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@ApiResponse({ status: 403, description: 'Không đủ quyền admin.' })
@Controller('admin/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminStudentsController {
  constructor(
    private readonly adminClassesService: AdminClassesService,
    private readonly adminStudentsService: AdminStudentsService,
  ) {}

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description:
      'Endpoint GET import-template trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('import-template')
  async downloadImportTemplate(@Res() res: Response) {
    const buffer = await this.adminClassesService.generateImportTemplate();

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=mau_import_sinh_vien.xlsx',
    });
    res.send(buffer);
  }

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload cho endpoint import.',
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description:
      'Endpoint POST import trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
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

  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description:
      'Endpoint POST import/confirm trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post('import/confirm')
  confirmImportStudents(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: ConfirmImportStudentsDto,
  ) {
    return this.adminClassesService.confirmImportStudents(
      userId,
      role,
      dto.importToken,
    );
  }

  // ─── CRUD hồ sơ sinh viên (Task 4.1) - Admin-only, đặt sau route tĩnh phía trên ──
  // để đảm bảo "import-template"/"import" luôn được match trước route ":id".

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description:
      'Endpoint GET / trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get()
  @Roles(UserRole.Admin)
  findAll(@Query() query: GetAdminStudentsQueryDto) {
    return this.adminStudentsService.findAll(query);
  }

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description:
      'Endpoint GET :id/evaluations trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get(':id/evaluations')
  @Roles(UserRole.Admin)
  findEvaluations(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminStudentsService.findEvaluations(id);
  }

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description:
      'Endpoint GET :id trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get(':id')
  @Roles(UserRole.Admin)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminStudentsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description:
      'Endpoint POST / trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post()
  @Roles(UserRole.Admin)
  create(@Body() dto: CreateStudentDto) {
    return this.adminStudentsService.create(dto);
  }

  @ApiOperation({
    summary: 'Cập nhật dữ liệu',
    description:
      'Endpoint PATCH :id trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Patch(':id')
  @Roles(UserRole.Admin)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.adminStudentsService.update(id, dto);
  }

  @ApiOperation({
    summary: 'Xóa dữ liệu',
    description:
      'Endpoint DELETE :id trong nhóm Admin Classes; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Delete(':id')
  @Roles(UserRole.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminStudentsService.remove(id);
  }
}
