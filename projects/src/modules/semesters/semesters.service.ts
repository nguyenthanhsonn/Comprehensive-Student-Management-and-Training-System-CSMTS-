import { Injectable, NotFoundException } from '@nestjs/common';
import { formatDateOnly } from '../../common/helpers/date-only.helper';
import { PrismaService } from '../../database/prisma.service';
import { SemesterNo } from '../../generated/prisma/client';
import { UserRole } from '../../common/shared';
import type {
  EvaluationPopupResponse,
  SemesterResponse,
} from './types/semester.types';
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

  async findEvaluationPopup(role: UserRole): Promise<EvaluationPopupResponse> {
    if (role !== UserRole.Student) {
      return emptyEvaluationPopup();
    }

    const today = new Date();
    const semester = await this.prisma.semester.findFirst({
      where: {
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: semesterSelect,
      orderBy: [{ year: 'desc' }, { semester: 'desc' }],
    });

    if (!semester) {
      return emptyEvaluationPopup();
    }

    const label = toSemesterName(semester.semester);
    const academicYear = `${semester.year}-${semester.year + 1}`;
    const deadlineText = semester.studentDeadline
      ? ` Hạn nộp: ${formatVietnamDate(semester.studentDeadline)}.`
      : '';

    return {
      visible: true,
      title: 'Mở đánh giá rèn luyện',
      content: `${label} năm học ${academicYear} hiện đã được mở để thực hiện đánh giá rèn luyện.${deadlineText} Đây là bước quan trọng trong quá trình xét kết quả rèn luyện, ảnh hưởng trực tiếp đến quyền lợi học bổng, thi đua, khen thưởng và các chế độ khác của bạn tại trường. Vui lòng vào hệ thống để thực hiện tự đánh giá càng sớm càng tốt.`,
      semesterId: semester.id,
      startDate: formatDateOnly(semester.startDate),
      endDate: formatDateOnly(semester.endDate),
    };
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

function emptyEvaluationPopup(): EvaluationPopupResponse {
  return {
    visible: false,
    title: null,
    content: null,
    semesterId: null,
    startDate: null,
    endDate: null,
  };
}

function formatVietnamDate(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}
