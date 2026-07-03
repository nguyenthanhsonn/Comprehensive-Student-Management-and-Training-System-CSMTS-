import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClassesQueryDto, MajorsQueryDto } from './dto/metadata-filter-query.dto';
import { MetadataService } from './metadata.service';

/**
 * Nhóm API dữ liệu danh mục gọn nhẹ (id/code/name) cho combobox/select.
 * Không giới hạn theo role — mọi user đã đăng nhập đều dùng chung được
 * (sinh viên cần dropdown học kỳ/năm học, admin cần dropdown khoa/ngành/lớp).
 */
@Controller('metadata')
@UseGuards(JwtAuthGuard)
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Get('semesters')
  getSemesters() {
    return this.metadataService.getSemesters();
  }

  @Get('academic-years')
  getAcademicYears() {
    return this.metadataService.getAcademicYears();
  }

  @Get('faculties')
  getFaculties() {
    return this.metadataService.getFaculties();
  }

  @Get('majors')
  getMajors(@Query() query: MajorsQueryDto) {
    return this.metadataService.getMajors(query.facultyId);
  }

  @Get('classes')
  getClasses(@Query() query: ClassesQueryDto) {
    return this.metadataService.getClasses(query.majorId);
  }
}
