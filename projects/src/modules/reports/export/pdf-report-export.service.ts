import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { EXPORT_COLUMNS } from '../constants/export-columns.constant';
import type { FlatExportRow } from '../types/report.types';

const ROW_HEIGHT = 20;
const FONT_SIZE = 8;

@Injectable()
export class PdfReportExportService {
  /**
   * Render danh sách kết quả rèn luyện thành file PDF dạng bảng, stream trực tiếp
   * vào response (pdfkit ghi từng phần ngay khi tạo, không buffer toàn bộ trước).
   */
  streamToResponse(rows: FlatExportRow[], res: Response, fileName: string): void {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    doc.fontSize(14).text('Bảng kết quả rèn luyện sinh viên', { align: 'center' });
    doc.moveDown();

    this.drawTable(doc, rows);

    doc.end();
  }

  /** Vẽ bảng thủ công theo cột cố định — pdfkit không có sẵn component table. */
  private drawTable(doc: PDFKit.PDFDocument, rows: FlatExportRow[]): void {
    const startX = doc.page.margins.left;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const columnWidth = usableWidth / EXPORT_COLUMNS.length;
    let y = doc.y;

    const drawRow = (values: string[], isHeader: boolean): void => {
      doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(FONT_SIZE);

      values.forEach((value, index) => {
        doc.text(value, startX + index * columnWidth, y, {
          width: columnWidth,
          height: ROW_HEIGHT,
          ellipsis: true,
        });
      });

      y += ROW_HEIGHT;
    };

    const headerValues = EXPORT_COLUMNS.map((column) => column.header);
    drawRow(headerValues, true);

    for (const row of rows) {
      if (y + ROW_HEIGHT > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawRow(headerValues, true);
      }

      const rowValues = EXPORT_COLUMNS.map((column) => String(row[column.key] ?? ''));
      drawRow(rowValues, false);
    }
  }
}
