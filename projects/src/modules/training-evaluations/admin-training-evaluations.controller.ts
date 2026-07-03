import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from 'src/common/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminTrainingEvaluationsService } from './admin-training-evaluations.service';
import { AdminListEvaluationsQueryDto } from './dto/admin-list-evaluations-query.dto';

@Controller('admin/training-evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminTrainingEvaluationsController {
  constructor(
    private readonly adminTrainingEvaluationsService: AdminTrainingEvaluationsService,
  ) {}

  @Get()
  @Roles(UserRole.Admin)
  findAll(@Query() query: AdminListEvaluationsQueryDto) {
    return this.adminTrainingEvaluationsService.findAll(query);
  }

  @Post(':id/reopen')
  @Roles(UserRole.Admin)
  reopen(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminTrainingEvaluationsService.reopen(id);
  }
}
