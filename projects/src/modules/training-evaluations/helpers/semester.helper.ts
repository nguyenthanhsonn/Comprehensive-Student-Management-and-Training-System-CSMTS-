import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SemesterNo } from '../../../generated/prisma/client';
import type { PrismaService } from '../../../database/prisma.service';
import type { TrainingEvaluationSemester } from '../dto/create-training-evaluation.dto';

/**
 * Parse và validate chuỗi năm học "YYYY-YYYY", trả về năm bắt đầu.
 * Ví dụ: "2024-2025" → 2024. Kiểm tra đây là dãy năm liên tiếp.
 *
 * @throws BadRequestException nếu chuỗi không đúng định dạng hoặc không liên tiếp
 */
export function parseAcademicYearStart(academicYear: string): number {
  const [startYearText, endYearText] = academicYear.split('-');
  const startYear = Number(startYearText);
  const endYear = Number(endYearText);

  if (!Number.isInteger(startYear) || endYear !== startYear + 1) {
    throw new BadRequestException(
      'academicYear phải là một khoảng năm liên tiếp, ví dụ 2025-2026',
    );
  }

  return startYear;
}

/**
 * Chuyển chuỗi học kỳ API (HK1/HK2/SUMMER) sang enum SemesterNo của DB.
 */
export function toSemesterNo(semester: TrainingEvaluationSemester): SemesterNo {
  const map: Record<TrainingEvaluationSemester, SemesterNo> = {
    HK1: SemesterNo.SEMESTER_1,
    HK2: SemesterNo.SEMESTER_2,
    SUMMER: SemesterNo.summer,
  };

  return map[semester];
}

/**
 * Quy đổi cặp (học kỳ, năm học) từ query string sang semesterId thực tế trong DB.
 * Hai tham số bắt buộc phải đi cùng nhau — thiếu 1 trong 2 sẽ báo lỗi 400.
 * Không truyền cả 2 → bỏ qua filter theo học kỳ (trả về undefined).
 * Dùng chung cho các module cần lọc dữ liệu theo học kỳ (admin list, reports).
 *
 * @throws BadRequestException nếu chỉ truyền 1 trong 2 tham số
 * @throws NotFoundException nếu không tìm thấy học kỳ tương ứng trong DB
 */
export async function resolveSemesterId(
  prisma: PrismaService,
  semester?: TrainingEvaluationSemester,
  academicYear?: string,
): Promise<string | undefined> {
  if (!semester && !academicYear) {
    return undefined;
  }

  if (!semester || !academicYear) {
    throw new BadRequestException(
      'semester và academicYear phải được truyền cùng nhau',
    );
  }

  const year = parseAcademicYearStart(academicYear);
  const semesterRecord = await prisma.semester.findUnique({
    where: { year_semester: { year, semester: toSemesterNo(semester) } },
    select: { id: true },
  });

  if (!semesterRecord) {
    throw new NotFoundException(
      'Không tìm thấy thông tin học kỳ cho năm học được yêu cầu',
    );
  }

  return semesterRecord.id;
}
