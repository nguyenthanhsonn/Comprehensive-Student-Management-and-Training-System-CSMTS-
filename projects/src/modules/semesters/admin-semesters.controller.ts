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

@Controller('admin/semesters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminSemestersController {
  constructor(private readonly adminSemestersService: AdminSemestersService) {}

  @Get()
  findAll(@Query() query: GetSemestersQueryDto) {
    return this.adminSemestersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminSemestersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSemesterDto) {
    return this.adminSemestersService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSemesterDto,
  ) {
    return this.adminSemestersService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleSemesterActiveDto,
  ) {
    return this.adminSemestersService.toggleActive(id, dto.isActive);
  }
}
