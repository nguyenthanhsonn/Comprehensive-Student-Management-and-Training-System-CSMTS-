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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminMajorsService } from './admin-majors.service';
import { CreateMajorDto } from './dto/create-major.dto';
import { GetMajorsQueryDto } from './dto/get-majors-query.dto';
import { UpdateMajorStatusDto } from './dto/update-major-status.dto';
import { UpdateMajorDto } from './dto/update-major.dto';
import { GetClassesQueryDto } from '../admin-classes/dto/get-classes-query.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';


@ApiTags('Majors')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@ApiResponse({ status: 403, description: 'Không đủ quyền truy cập dữ liệu ngành này.' })
@Controller('majors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin, UserRole.Faculty)
export class MajorsController {
  constructor(private readonly adminMajorsService: AdminMajorsService) {}

  @ApiOperation({
    summary: 'Danh sách lớp thuộc ngành',
    description:
      'Endpoint dùng chung cho admin và khoa. Admin xem mọi ngành, tài khoản khoa chỉ xem ngành thuộc khoa được gán.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get(':id/classes')
  findClassesByMajor(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetClassesQueryDto,
  ) {
    return this.adminMajorsService.findClassesForViewer(userId, role, id, query);
  }
}

@ApiTags('Admin Majors')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@Controller('admin/majors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminMajorsController {
  constructor(private readonly adminMajorsService: AdminMajorsService) {}

  @Get()
  findAll(@Query() query: GetMajorsQueryDto) {
    return this.adminMajorsService.findAll(query);
  }

  // Backward-compatible route cũ; FE nên chuyển sang GET /majors/:id/classes.
  @ApiOperation({
    summary: 'Danh sách lớp thuộc ngành (route admin cũ)',
    description:
      'Giữ để tương thích với FE cũ. Luồng dùng chung cho admin và khoa là GET /majors/:id/classes.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get(':id/classes')
  findClasses(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetClassesQueryDto,
  ) {
    return this.adminMajorsService.findClasses(id, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminMajorsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMajorDto) {
    return this.adminMajorsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMajorDto) {
    return this.adminMajorsService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMajorStatusDto,
  ) {
    return this.adminMajorsService.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminMajorsService.remove(id);
  }
}

@ApiTags('Faculty Majors')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@ApiResponse({
  status: 403,
  description:
    'Tài khoản khoa chưa được gán khoa hoặc không có quyền truy cập.',
})
@Controller('faculty/majors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Faculty)
export class FacultyMajorsController {
  constructor(private readonly adminMajorsService: AdminMajorsService) {}

  @ApiOperation({
    summary: 'Khoa lấy danh sách ngành mình quản lý',
    description:
      'Dựa vào faculty_assignments của tài khoản đang đăng nhập, trả về danh sách ngành thuộc khoa đó.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get()
  findMyMajors(
    @CurrentUser('id') userId: string,
    @Query() query: GetMajorsQueryDto,
  ) {
    return this.adminMajorsService.findMajorsForFacultyUser(userId, query);
  }

  // Backward-compatible route cũ; FE nên chuyển sang GET /majors/:id/classes.
  @ApiOperation({
    summary: 'Khoa lấy danh sách lớp trong ngành mình quản lý (route cũ)',
    description:
      'Giữ để tương thích với FE cũ. Luồng dùng chung cho admin và khoa là GET /majors/:id/classes.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 403, description: 'Ngành không thuộc khoa được gán.' })
  @Get(':id/classes')
  findMyClassesByMajor(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetClassesQueryDto,
  ) {
    return this.adminMajorsService.findClassesForFacultyUser(userId, id, query);
  }
}
