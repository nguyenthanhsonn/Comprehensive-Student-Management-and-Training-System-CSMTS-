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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { QueryAdminUserDto } from './dto/query-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

/** Quản lý tài khoản (mọi role) — chỉ Admin được truy cập. */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ResponseMessage(ADMIN_MESSAGES.GET_USERS_SUCCESS)
  findMany(@Query() query: QueryAdminUserDto) {
    return this.adminUsersService.findMany(query);
  }

  @Post()
  @ResponseMessage(ADMIN_MESSAGES.CREATE_USER_SUCCESS)
  create(@Body() dto: CreateAdminUserDto) {
    return this.adminUsersService.create(dto);
  }

  @Get(':id')
  @ResponseMessage(ADMIN_MESSAGES.GET_USER_SUCCESS)
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsersService.findById(id);
  }

  @Patch(':id')
  @ResponseMessage(ADMIN_MESSAGES.UPDATE_USER_SUCCESS)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminUsersService.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage(ADMIN_MESSAGES.DELETE_USER_SUCCESS)
  softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsersService.softDelete(id);
  }

  @Patch(':id/lock')
  @ResponseMessage(ADMIN_MESSAGES.LOCK_USER_SUCCESS)
  lock(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsersService.lock(id);
  }

  @Patch(':id/unlock')
  @ResponseMessage(ADMIN_MESSAGES.UNLOCK_USER_SUCCESS)
  unlock(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsersService.unlock(id);
  }

  @Patch(':id/role')
  @ResponseMessage(ADMIN_MESSAGES.UPDATE_ROLE_SUCCESS)
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.adminUsersService.updateRole(id, dto, currentUserId);
  }
}
