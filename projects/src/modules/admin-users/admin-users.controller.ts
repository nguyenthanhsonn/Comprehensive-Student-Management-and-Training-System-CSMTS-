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
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { GetAdminUsersQueryDto } from './dto/get-admin-users-query.dto';
import { LockAdminUserDto } from './dto/lock-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Admin Users')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET / trong nhóm Admin Users; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get()
  findAll(@Query() query: GetAdminUsersQueryDto) {
    return this.adminUsersService.findAll(query);
  }

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET :id trong nhóm Admin Users; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsersService.findOne(id);
  }

  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description: 'Endpoint POST / trong nhóm Admin Users; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post()
  create(@Body() dto: CreateAdminUserDto) {
    return this.adminUsersService.create(dto);
  }

  @ApiOperation({
    summary: 'Cập nhật dữ liệu',
    description: 'Endpoint PATCH :id trong nhóm Admin Users; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.adminUsersService.update(id, dto, currentUserId);
  }

  @ApiOperation({
    summary: 'Xóa dữ liệu',
    description: 'Endpoint DELETE :id trong nhóm Admin Users; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.adminUsersService.remove(id, currentUserId);
  }

  @ApiOperation({
    summary: 'Cập nhật dữ liệu',
    description: 'Endpoint PATCH :id/lock trong nhóm Admin Users; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Patch(':id/lock')
  lock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LockAdminUserDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.adminUsersService.lock(id, dto, currentUserId);
  }
}
