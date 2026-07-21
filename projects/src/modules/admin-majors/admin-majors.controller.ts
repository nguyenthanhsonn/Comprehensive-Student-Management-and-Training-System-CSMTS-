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
  AdminMajorsService,
  type UploadedMajorExcelFile,
} from './admin-majors.service';
import { CreateMajorDto } from './dto/create-major.dto';
import { GetMajorsQueryDto } from './dto/get-majors-query.dto';
import { UpdateMajorStatusDto } from './dto/update-major-status.dto';
import { UpdateMajorDto } from './dto/update-major.dto';

@Controller('admin/majors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminMajorsController {
  constructor(private readonly adminMajorsService: AdminMajorsService) {}

  @Get()
  findAll(@Query() query: GetMajorsQueryDto) {
    return this.adminMajorsService.findAll(query);
  }

  @Get('import-template')
  async downloadImportTemplate(@Res() res: Response) {
    const buffer = await this.adminMajorsService.generateImportTemplate();

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=mau_import_nganh.xlsx',
    });
    res.send(buffer);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importMajors(
    @Body('facultyId') facultyId: string | undefined,
    @UploadedFile() file: UploadedMajorExcelFile | undefined,
  ) {
    return this.adminMajorsService.importFromTemplate(facultyId, file);
  }

  @Post('import/confirm')
  confirmImportMajors(@Body() dto: ConfirmImportDto) {
    return this.adminMajorsService.confirmImport(dto.importToken);
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
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMajorDto,
  ) {
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
