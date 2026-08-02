import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminSemestersService } from './admin-semesters.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { GetSemestersQueryDto } from './dto/get-semesters-query.dto';
import { ToggleSemesterActiveDto } from './dto/toggle-semester-active.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Admin Semesters')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@Controller('admin/semesters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminSemestersController {
  constructor(private readonly adminSemestersService: AdminSemestersService) {}

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET / trong nhóm Admin Semesters; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get()
  findAll(@Query() query: GetSemestersQueryDto) {
    return this.adminSemestersService.findAll(query);
  }

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET :id trong nhóm Admin Semesters; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminSemestersService.findOne(id);
  }

  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description: 'Endpoint POST / trong nhóm Admin Semesters; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post()
  create(@Body() dto: CreateSemesterDto) {
    return this.adminSemestersService.create(dto);
  }

  @ApiOperation({
    summary: 'Cập nhật dữ liệu',
    description: 'Endpoint PATCH :id trong nhóm Admin Semesters; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSemesterDto,
  ) {
    return this.adminSemestersService.update(id, dto);
  }

  @ApiOperation({
    summary: 'Cập nhật dữ liệu',
    description: 'Endpoint PATCH :id/toggle-active trong nhóm Admin Semesters; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Patch(':id/toggle-active')
  toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleSemesterActiveDto,
  ) {
    return this.adminSemestersService.toggleActive(id, dto.isActive);
  }
}
