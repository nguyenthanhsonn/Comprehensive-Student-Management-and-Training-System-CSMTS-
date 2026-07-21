import { Injectable, NotFoundException } from '@nestjs/common';
import { formatDateOnly } from '../../common/helpers/date-only.helper';
import { PrismaService } from '../../database/prisma.service';
import { SemesterNo } from '../../generated/prisma/client';
import type { SemesterResponse } from './types/semester.types';
import type { ApiSemester } from './types/api-semester.type';

type SemesterRecord = {
  id: string;
  year: number;
  semester: SemesterNo;
  startDate: Date;
  endDate: Date;
  studentDeadline: Date | null;
  classDeadline: Date | null;
  facultyDeadline: Date | null;
  isActive: boolean;
};

@Injectable()
export class SemestersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SemesterResponse[]> {
    const semesters = await this.prisma.semester.findMany({
      select: semesterSelect,
      orderBy: [{ year: 'desc' }, { semester: 'desc' }],
    });

    return semesters.map(mapToSemesterResponse);
  }

  async findCurrent(): Promise<SemesterResponse> {
    const today = new Date();
    const currentSemester = await this.prisma.semester.findFirst({
      where: {
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: semesterSelect,
      orderBy: [{ year: 'desc' }, { semester: 'desc' }],
    });

    if (currentSemester) {
      return mapToSemesterResponse(currentSemester);
    }

    const activeSemester = await this.prisma.semester.findFirst({
      where: { isActive: true },
      select: semesterSelect,
      orderBy: [{ year: 'desc' }, { semester: 'desc' }],
    });

    if (!activeSemester) {
      throw new NotFoundException('Không tìm thấy học kỳ đang hoạt động');
    }

    return mapToSemesterResponse(activeSemester);
  }
}

const semesterSelect = {
  id: true,
  year: true,
  semester: true,
  startDate: true,
  endDate: true,
  studentDeadline: true,
  classDeadline: true,
  facultyDeadline: true,
  isActive: true,
} as const;

export function mapToSemesterResponse(record: SemesterRecord): SemesterResponse {
  const academicYear = `${record.year}-${record.year + 1}`;
  const semester = toApiSemester(record.semester);
  const semesterName = toSemesterName(record.semester);

  return {
    id: record.id,
    year: record.year,
    academicYear,
    semester,
    semesterName,
    name: `${semesterName} ${academicYear}`,
    startDate: formatDateOnly(record.startDate),
    endDate: formatDateOnly(record.endDate),
    studentDeadline: record.studentDeadline,
    classDeadline: record.classDeadline,
    facultyDeadline: record.facultyDeadline,
    isActive: record.isActive,
  };
}

export function toApiSemester(semester: SemesterNo): ApiSemester {
  const map: Record<SemesterNo, ApiSemester> = {
    [SemesterNo.SEMESTER_1]: 'HK1',
    [SemesterNo.SEMESTER_2]: 'HK2',
    [SemesterNo.summer]: 'SUMMER',
  };

  return map[semester];
}

export function toSemesterName(semester: SemesterNo): string {
  const map: Record<SemesterNo, string> = {
    [SemesterNo.SEMESTER_1]: 'Học kỳ 1',
    [SemesterNo.SEMESTER_2]: 'Học kỳ 2',
    [SemesterNo.summer]: 'Học kỳ hè',
  };

  return map[semester];
}

export function toSemesterNo(semester: ApiSemester): SemesterNo {
  const map: Record<ApiSemester, SemesterNo> = {
    HK1: SemesterNo.SEMESTER_1,
    HK2: SemesterNo.SEMESTER_2,
    SUMMER: SemesterNo.summer,
  };

  return map[semester];
}
