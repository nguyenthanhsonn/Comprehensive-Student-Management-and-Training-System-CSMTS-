import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from 'src/common/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminTrainingEvaluationsService } from './admin-training-evaluations.service';
import { AdminListEvaluationsQueryDto } from './dto/admin-list-evaluations-query.dto';
import { BulkFinalizeDto } from './dto/bulk-finalize.dto';
import { FinalizeByFilterDto } from './dto/finalize-by-filter.dto';
import { FinalizeEvaluationDto } from './dto/finalize-evaluation.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Admin Evaluations')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Thiếu hoặc sai access token.' })
@Controller([
  'admin/evaluations',
  // TODO: Route /admin/training-evaluations là alias tạm giữ tương thích
  // ngược cho client cũ. Sau khi FE xác nhận đã chuyển hẳn sang
  // /admin/evaluations, xóa alias này. Ngày thêm: 18/07/2026.
  'admin/training-evaluations',
])
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminTrainingEvaluationsController {
  constructor(
    private readonly adminTrainingEvaluationsService: AdminTrainingEvaluationsService,
  ) {}

  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET / trong nhóm Admin Evaluations; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get()
  findAll(@Query() query: AdminListEvaluationsQueryDto) {
    return this.adminTrainingEvaluationsService.findAll(query);
  }

  @ApiOperation({
    summary: 'Cập nhật dữ liệu',
    description: 'Endpoint PATCH bulk-finalize trong nhóm Admin Evaluations; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Patch('bulk-finalize')
  bulkFinalize(
    @CurrentUser('id') adminId: string,
    @Body() dto: BulkFinalizeDto,
  ) {
    return this.adminTrainingEvaluationsService.bulkFinalize(adminId, dto);
  }

  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description: 'Endpoint POST finalize-by-filter trong nhóm Admin Evaluations; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post('finalize-by-filter')
  finalizeByFilter(
    @CurrentUser('id') adminId: string,
    @Body() dto: FinalizeByFilterDto,
  ) {
    return this.adminTrainingEvaluationsService.finalizeByFilter(adminId, dto);
  }

  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description: 'Endpoint POST :id/reopen trong nhóm Admin Evaluations; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post(':id/reopen')
  reopen(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminTrainingEvaluationsService.reopen(id);
  }

  @ApiOperation({
    summary: 'Cập nhật dữ liệu',
    description: 'Endpoint PATCH :id/finalize trong nhóm Admin Evaluations; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Patch(':id/finalize')
  finalize(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizeEvaluationDto,
  ) {
    return this.adminTrainingEvaluationsService.finalize(adminId, id, dto);
  }
}
