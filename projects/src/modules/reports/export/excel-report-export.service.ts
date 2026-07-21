import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { EXPORT_COLUMNS } from '../constants/export-columns.constant';
import type { FlatExportRow } from '../types/report.types';

@Injectable()
export class ExcelReportExportService {
  /**
   * Render danh sách kết quả rèn luyện thành file Excel (.xlsx), stream trực tiếp
   * vào response — không buffer toàn bộ file trong RAM trước khi gửi cho client.
   */
  async streamToResponse(
    rows: FlatExportRow[],
    res: Response,
    fileName: string,
  ): Promise<void> {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
    const sheet = workbook.addWorksheet('Kết quả rèn luyện');

    sheet.columns = EXPORT_COLUMNS.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
    }));
    sheet.getRow(1).font = { bold: true };

    for (const row of rows) {
      sheet.addRow(row).commit();
    }

    sheet.commit();
    await workbook.commit();
  }
}
