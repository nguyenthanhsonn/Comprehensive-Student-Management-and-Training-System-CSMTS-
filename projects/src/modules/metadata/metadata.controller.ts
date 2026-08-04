import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClassesQueryDto, MajorsQueryDto } from './dto/metadata-filter-query.dto';
import { MetadataService } from './metadata.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

/**
 * Nhóm API dữ liệu danh mục gọn nhẹ (id/code/name) cho combobox/select.
 * Không giới hạn theo role — mọi user đã đăng nhập đều dùng chung được
 * (sinh viên cần dropdown học kỳ/năm học, admin cần dropdown khoa/ngành/lớp).
 */
@ApiTags('Metadata')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@Controller('metadata')
@UseGuards(JwtAuthGuard)
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @ApiOperation({
    summary: 'Lấy danh sách khoa',
    description: 'Trả về danh sách khoa đang hoạt động để FE render combobox cấp khoa.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('faculties')
  getFaculties() {
    return this.metadataService.getFaculties();
  }

  @ApiOperation({
    summary: 'Lấy danh sách ngành',
    description: 'Trả về danh sách ngành đang hoạt động, có thể lọc theo facultyId.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('majors')
  getMajors(@Query() query: MajorsQueryDto) {
    return this.metadataService.getMajors(query.facultyId);
  }


  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET classes trong nhóm Metadata; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('classes')
  getClasses(@Query() query: ClassesQueryDto) {
    return this.metadataService.getClasses(query.majorId);
  }
}
