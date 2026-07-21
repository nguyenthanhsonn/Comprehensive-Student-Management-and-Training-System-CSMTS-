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
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AdminListEvaluationsQueryDto } from './dto/admin-list-evaluations-query.dto';
import { CreateTrainingEvaluationDto } from './dto/create-training-evaluation.dto';
import { ReviewScoresDto } from './dto/review-scores.dto';
import { ReviewTrainingEvaluationDto } from './dto/review-training-evaluation.dto';
import { UpdateActivityScoreDto } from './dto/update-activity-score.dto';
import { UpdateCommunityScoreDto } from './dto/update-community-score.dto';
import { UpdateDisciplineScoreDto } from './dto/update-discipline-score.dto';
import { UpdateRoleScoreDto } from './dto/update-role-score.dto';
import { UpdateStudyScoreDto } from './dto/update-study-score.dto';
import { UpdateTrainingEvaluationDraftDto } from './dto/update-training-evaluation-draft.dto';
import { TrainingEvaluationsService } from './training-evaluations.service';

const ALL_ROLES = [UserRole.Student, UserRole.ClassCouncil, UserRole.Admin];

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

  @Get()
  @Roles(UserRole.ClassCouncil, UserRole.Admin)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminListEvaluationsQueryDto,
  ) {
    return this.trainingEvaluationsService.findAll(user, query);
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

  @Patch(':id/study-score')
  @Roles(UserRole.Student)
  updateStudyScore(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudyScoreDto,
  ) {
    return this.trainingEvaluationsService.updateStudyScore(userId, id, dto);
  }

  @Patch(':id/discipline-score')
  @Roles(UserRole.Student)
  updateDisciplineScore(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDisciplineScoreDto,
  ) {
    return this.trainingEvaluationsService.updateDisciplineScore(
      userId,
      id,
      dto,
    );
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

  @Patch(':id/community-score')
  @Roles(UserRole.Student)
  updateCommunityScore(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommunityScoreDto,
  ) {
    return this.trainingEvaluationsService.updateCommunityScore(
      userId,
      id,
      dto,
    );
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

  @Patch(':id/review-scores')
  @Roles(UserRole.ClassCouncil)
  reviewScores(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewScoresDto,
  ) {
    return this.trainingEvaluationsService.reviewScores(userId, id, dto);
  }

  @Post(':id/review')
  @Roles(UserRole.ClassCouncil, UserRole.Admin)
  review(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewTrainingEvaluationDto,
  ) {
    return this.trainingEvaluationsService.review(reviewer, id, dto);
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
