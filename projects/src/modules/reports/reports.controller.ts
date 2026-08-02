import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from 'src/common/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsAggregateQueryDto } from './dto/reports-aggregate-query.dto';
import { ReportsExportQueryDto } from './dto/reports-export-query.dto';
import { ExcelReportExportService } from './export/excel-report-export.service';
import { PdfReportExportService } from './export/pdf-report-export.service';
import { ReportsService } from './reports.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Admin Reports')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly excelExportService: ExcelReportExportService,
    private readonly pdfExportService: PdfReportExportService,
  ) {}

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET overview trong nhóm Admin Reports; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('overview')
  getOverview(@Query() query: ReportsAggregateQueryDto) {
    return this.reportsService.getOverview(query);
  }

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET training-results trong nhóm Admin Reports; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('training-results')
  getTrainingResults(@Query() query: ReportsAggregateQueryDto) {
    return this.reportsService.getTrainingResults(query);
  }

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET by-class trong nhóm Admin Reports; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('by-class')
  getByClass(@Query() query: ReportsAggregateQueryDto) {
    return this.reportsService.getByClass(query);
  }

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET by-faculty trong nhóm Admin Reports; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('by-faculty')
  getByFaculty(@Query() query: ReportsAggregateQueryDto) {
    return this.reportsService.getByFaculty(query);
  }

  /**
   * Xuất file Excel — dùng @Res() (không passthrough) để tự kiểm soát toàn bộ response,
   * bỏ qua ResponseInterceptor toàn cục (interceptor đó bọc JSON, sẽ phá hỏng file nhị phân).
   */
  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET export-excel trong nhóm Admin Reports; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('export-excel')
  async exportExcel(
    @Query() query: ReportsExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportsService.getExportRows(query);
    await this.excelExportService.streamToResponse(
      rows,
      res,
      this.buildFileName(query, 'xlsx'),
    );
  }

  /** Xuất file PDF — cùng lý do dùng @Res() như export-excel. */
  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET export-pdf trong nhóm Admin Reports; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('export-pdf')
  async exportPdf(
    @Query() query: ReportsExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportsService.getExportRows(query);
    this.pdfExportService.streamToResponse(rows, res, this.buildFileName(query, 'pdf'));
  }

  private buildFileName(query: ReportsExportQueryDto, extension: string): string {
    const parts = ['ket-qua-ren-luyen', query.academicYear, query.semester].filter(
      Boolean,
    );

    return `${parts.join('-')}.${extension}`;
  }
}
