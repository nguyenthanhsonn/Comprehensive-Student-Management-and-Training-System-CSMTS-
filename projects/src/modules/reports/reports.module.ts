import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ExcelReportExportService } from './export/excel-report-export.service';
import { PdfReportExportService } from './export/pdf-report-export.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService, ExcelReportExportService, PdfReportExportService],
})
export class ReportsModule {}
