import { Controller, Get } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @ApiOperation({
    summary: 'Lấy dữ liệu',
    description: 'Endpoint GET health trong nhóm Health; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 200, description: 'Thao tác thành công.' })
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'smaste-backend',
    };
  }
}
