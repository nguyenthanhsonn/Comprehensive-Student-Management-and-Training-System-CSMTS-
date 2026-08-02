import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserRole } from '../../common/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SemestersService } from './semesters.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Semesters')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@Controller('semesters')
@UseGuards(JwtAuthGuard)
export class SemestersController {
  constructor(private readonly semestersService: SemestersService) {}

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET / trong nhóm Semesters; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get()
  findAll() {
    return this.semestersService.findAll();
  }

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET current trong nhóm Semesters; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('current')
  findCurrent() {
    return this.semestersService.findCurrent();
  }

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET evaluation-popup trong nhóm Semesters; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('evaluation-popup')
  findEvaluationPopup(@CurrentUser('role') role: UserRole) {
    return this.semestersService.findEvaluationPopup(role);
  }
}
