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
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AdminFacultiesService,
  type UploadedFacultyExcelFile,
} from './admin-faculties.service';
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

  @Get('import-template')
  async downloadImportTemplate(@Res() res: Response) {
    const buffer = await this.adminFacultiesService.generateImportTemplate();

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=mau_import_khoa.xlsx',
    });
    res.send(buffer);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importFaculties(@UploadedFile() file: UploadedFacultyExcelFile | undefined) {
    return this.adminFacultiesService.importFromTemplate(file);
  }

  @Post('import/confirm')
  confirmImportFaculties(@Body() dto: ConfirmImportDto) {
    return this.adminFacultiesService.confirmImport(dto.importToken);
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
