import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from 'src/common/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTrainingEvaluationDto } from './dto/create-training-evaluation.dto';
import { UpdateActivityScoreDto } from './dto/update-activity-score.dto';
import { UpdateCommunityScoreDto } from './dto/update-community-score.dto';
import { UpdateDisciplineScoreDto } from './dto/update-discipline-score.dto';
import { UpdateRoleScoreDto } from './dto/update-role-score.dto';
import { UpdateStudyScoreDto } from './dto/update-study-score.dto';
import { UpdateTrainingEvaluationDraftDto } from './dto/update-training-evaluation-draft.dto';
import { TrainingEvaluationsService } from './training-evaluations.service';

const ALL_ROLES = [
  UserRole.Student,
  UserRole.ClassCouncil,
  UserRole.FacultyCouncil,
  UserRole.Admin,
];

@Controller('training-evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainingEvaluationsController {
  constructor(
    private readonly trainingEvaluationsService: TrainingEvaluationsService,
  ) {}

  @Post()
  @Roles(UserRole.Student)
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTrainingEvaluationDto,
  ) {
    return this.trainingEvaluationsService.create(userId, dto);
  }

  @Get('me')
  @Roles(UserRole.Student)
  findMine(@CurrentUser('id') userId: string) {
    return this.trainingEvaluationsService.findMine(userId);
  }

  @Get(':id/summary')
  @Roles(...ALL_ROLES)
  getSummary(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getSummary(userId, role, id);
  }

  @Get(':id/status')
  @Roles(...ALL_ROLES)
  getStatus(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getStatus(userId, role, id);
  }

  @Get(':id/study-score')
  @Roles(...ALL_ROLES)
  getStudyScore(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getStudyScore(userId, role, id);
  }

  @Patch(':id/study-score')
  @Roles(UserRole.Student)
  updateStudyScore(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudyScoreDto,
  ) {
    return this.trainingEvaluationsService.updateStudyScore(userId, id, dto);
  }

  @Get(':id/discipline-score')
  @Roles(...ALL_ROLES)
  getDisciplineScore(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getDisciplineScore(userId, role, id);
  }

  @Patch(':id/discipline-score')
  @Roles(UserRole.Student)
  updateDisciplineScore(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDisciplineScoreDto,
  ) {
    return this.trainingEvaluationsService.updateDisciplineScore(userId, id, dto);
  }

  @Get(':id/activity-score')
  @Roles(...ALL_ROLES)
  getActivityScore(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getActivityScore(userId, role, id);
  }

  @Patch(':id/activity-score')
  @Roles(UserRole.Student)
  updateActivityScore(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityScoreDto,
  ) {
    return this.trainingEvaluationsService.updateActivityScore(userId, id, dto);
  }

  @Get(':id/community-score')
  @Roles(...ALL_ROLES)
  getCommunityScore(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getCommunityScore(userId, role, id);
  }

  @Patch(':id/community-score')
  @Roles(UserRole.Student)
  updateCommunityScore(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommunityScoreDto,
  ) {
    return this.trainingEvaluationsService.updateCommunityScore(userId, id, dto);
  }

  @Get(':id/role-score')
  @Roles(...ALL_ROLES)
  getRoleScore(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getRoleScore(userId, role, id);
  }

  @Patch(':id/role-score')
  @Roles(UserRole.Student)
  updateRoleScore(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleScoreDto,
  ) {
    return this.trainingEvaluationsService.updateRoleScore(userId, id, dto);
  }

  @Post(':id/submit')
  @Roles(UserRole.Student)
  submit(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.submit(userId, id);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  findOne(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.findOne(userId, role, id);
  }

  @Patch(':id')
  @Roles(UserRole.Student)
  updateDraft(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainingEvaluationDraftDto,
  ) {
    return this.trainingEvaluationsService.updateDraft(userId, id, dto);
  }
}
