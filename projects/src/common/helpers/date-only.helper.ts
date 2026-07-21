import { BadRequestException } from '@nestjs/common';

export const DATE_ONLY_FORMAT_MESSAGE =
  'Ngày sinh phải theo định dạng YYYY-MM-DD';
export const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const EXCEL_DATE_EPOCH = Date.UTC(1899, 11, 30);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function parseOptionalDateOnly(
  value: Date | number | string | null | undefined,
  fieldName = 'Ngày sinh',
): Date | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  if (value instanceof Date) {
    assertValidDate(value, fieldName);
    return toUtcDateOnly(value);
  }

  if (typeof value === 'number') {
    return parseExcelSerialDate(value, fieldName);
  }

  const dateText = value.trim();
  const match = DATE_ONLY_PATTERN.exec(dateText);

  if (!match) {
    throw new BadRequestException(`${fieldName} phải theo định dạng YYYY-MM-DD`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${fieldName} không hợp lệ`);
  }

  return parsedDate;
}

export function formatDateOnly(date: Date | string | null): string | null {
  if (!date) {
    return null;
  }

  const parsedDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return toUtcDateOnly(parsedDate).toISOString().slice(0, 10);
}

function parseExcelSerialDate(serial: number, fieldName: string): Date {
  if (!Number.isFinite(serial) || serial <= 0) {
    throw new BadRequestException(`${fieldName} không hợp lệ`);
  }

  const parsedDate = new Date(EXCEL_DATE_EPOCH + Math.floor(serial) * ONE_DAY_MS);
  assertValidDate(parsedDate, fieldName);
  return parsedDate;
}

function assertValidDate(date: Date, fieldName: string): void {
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${fieldName} không hợp lệ`);
  }
}

function toUtcDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}
