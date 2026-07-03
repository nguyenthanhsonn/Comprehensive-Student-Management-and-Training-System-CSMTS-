import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SEMESTER_OPTIONS } from './constants/semester-options.constant';
import { MetadataCacheHelper } from './helpers/metadata-cache.helper';
import {
  classMetadataSelect,
  facultyMetadataSelect,
  majorMetadataSelect,
} from './selects/metadata.select';
import type { MetadataItem, SemesterOption } from './types/metadata.types';

@Injectable()
export class MetadataService {
  private readonly cache = new MetadataCacheHelper();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Danh sách loại học kỳ (HK1/HK2/Hè) cho combobox.
   * Dữ liệu tĩnh, không truy vấn DB — nhanh nhất có thể.
   */
  getSemesters(): SemesterOption[] {
    return SEMESTER_OPTIONS;
  }

  /**
   * Danh sách năm học đang có dữ liệu trong hệ thống (suy ra từ bảng `semesters`),
   * sắp xếp mới nhất trước. Chỉ hiện năm học nào đã thực sự tồn tại record.
   */
  async getAcademicYears(): Promise<SemesterOption[]> {
    return this.cache.getOrLoad('academic-years', async () => {
      const rows = await this.prisma.semester.findMany({
        distinct: ['year'],
        select: { year: true },
        orderBy: { year: 'desc' },
      });

      return rows.map((row) => {
        const academicYear = `${row.year}-${row.year + 1}`;
        return { code: academicYear, name: academicYear };
      });
    });
  }

  /**
   * Danh sách khoa đang hoạt động, sắp xếp theo tên.
   */
  async getFaculties(): Promise<MetadataItem[]> {
    return this.cache.getOrLoad('faculties', () =>
      this.prisma.faculty.findMany({
        where: { isActive: true },
        select: facultyMetadataSelect,
        orderBy: { name: 'asc' },
      }),
    );
  }

  /**
   * Danh sách ngành đang hoạt động, sắp xếp theo tên.
   * Có thể lọc theo `facultyId` để phục vụ combobox phân cấp Khoa → Ngành.
   */
  async getMajors(facultyId?: string): Promise<MetadataItem[]> {
    return this.cache.getOrLoad(`majors:${facultyId ?? 'all'}`, () =>
      this.prisma.major.findMany({
        where: { isActive: true, ...(facultyId && { facultyId }) },
        select: majorMetadataSelect,
        orderBy: { name: 'asc' },
      }),
    );
  }

  /**
   * Danh sách lớp đang hoạt động, lớp mới (khóa gần đây) hiện trước.
   * Có thể lọc theo `majorId` để phục vụ combobox phân cấp Ngành → Lớp.
   */
  async getClasses(majorId?: string): Promise<MetadataItem[]> {
    return this.cache.getOrLoad(`classes:${majorId ?? 'all'}`, () =>
      this.prisma.class.findMany({
        where: { isActive: true, ...(majorId && { majorId }) },
        select: classMetadataSelect,
        orderBy: [{ enrollmentYear: 'desc' }, { name: 'asc' }],
      }),
    );
  }
}
