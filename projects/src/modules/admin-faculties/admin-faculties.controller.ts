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
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminFacultiesService } from './admin-faculties.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { GetFacultiesQueryDto } from './dto/get-faculties-query.dto';
import { UpdateFacultyStatusDto } from './dto/update-faculty-status.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';

@Controller('admin/faculties')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminFacultiesController {
  constructor(private readonly adminFacultiesService: AdminFacultiesService) {}

  @Get()
  findAll(@Query() query: GetFacultiesQueryDto) {
    return this.adminFacultiesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFacultiesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFacultyDto) {
    return this.adminFacultiesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacultyDto,
  ) {
    return this.adminFacultiesService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacultyStatusDto,
  ) {
    return this.adminFacultiesService.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFacultiesService.remove(id);
  }
}
