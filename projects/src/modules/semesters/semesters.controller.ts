import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserRole } from '../../common/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SemestersService } from './semesters.service';

@Controller('semesters')
@UseGuards(JwtAuthGuard)
export class SemestersController {
  constructor(private readonly semestersService: SemestersService) {}

  @Get()
  findAll() {
    return this.semestersService.findAll();
  }

  @Get('current')
  findCurrent() {
    return this.semestersService.findCurrent();
  }

  @Get('evaluation-popup')
  findEvaluationPopup(@CurrentUser('role') role: UserRole) {
    return this.semestersService.findEvaluationPopup(role);
  }
}
