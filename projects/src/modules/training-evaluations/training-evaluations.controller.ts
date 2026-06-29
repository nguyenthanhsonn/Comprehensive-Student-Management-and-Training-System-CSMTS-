import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from 'src/common/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/types/authenticated-user.type';
import { CreateTrainingEvaluationDto } from './dto/create-training-evaluation.dto';
import { UpdateActivityScoreDto } from './dto/update-activity-score.dto';
import { UpdateCommunityScoreDto } from './dto/update-community-score.dto';
import { UpdateDisciplineScoreDto } from './dto/update-discipline-score.dto';
import { UpdateRoleScoreDto } from './dto/update-role-score.dto';
import { UpdateStudyScoreDto } from './dto/update-study-score.dto';
import { UpdateTrainingEvaluationDraftDto } from './dto/update-training-evaluation-draft.dto';
import { TrainingEvaluationsService } from './training-evaluations.service';

@Controller('training-evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Student)
export class TrainingEvaluationsController {
  constructor(
    private readonly trainingEvaluationsService: TrainingEvaluationsService,
  ) { }

  @Post()
  create(
    @Req() request: RequestWithUser,
    @Body() dto: CreateTrainingEvaluationDto,
  ) {
    return this.trainingEvaluationsService.create(request.user, dto);
  }

  @Get('me')
  findMine(@Req() request: RequestWithUser) {
    return this.trainingEvaluationsService.findMine(request.user);
  }

  @Get(':id/summary')
  getSummary(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getSummary(request.user, id);
  }

  @Get(':id/status')
  getStatus(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getStatus(request.user, id);
  }

  @Post(':id/submit')
  submit(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.submit(request.user, id);
  }
  @Get(':id')
  findOne(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.findOne(request.user, id);
  }

  @Patch(':id')
  updateDraft(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainingEvaluationDraftDto,
  ) {
    return this.trainingEvaluationsService.updateDraft(request.user, id, dto);
  }

  @Get(':id/study-score')
  getStudyScore(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getStudyScore(request.user, id);
  }

  @Patch(':id/study-score')
  updateStudyScore(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudyScoreDto,
  ) {
    return this.trainingEvaluationsService.updateStudyScore(
      request.user,
      id,
      dto,
    );
  }

  @Get(':id/discipline-score')
  getDisciplineScore(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getDisciplineScore(request.user, id);
  }

  @Patch(':id/discipline-score')
  updateDisciplineScore(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDisciplineScoreDto,
  ) {
    return this.trainingEvaluationsService.updateDisciplineScore(
      request.user,
      id,
      dto,
    );
  }

  @Get(':id/activity-score')
  getActivityScore(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getActivityScore(request.user, id);
  }

  @Patch(':id/activity-score')
  updateActivityScore(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityScoreDto,
  ) {
    return this.trainingEvaluationsService.updateActivityScore(
      request.user,
      id,
      dto,
    );
  }

  @Get(':id/community-score')
  getCommunityScore(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getCommunityScore(request.user, id);
  }

  @Patch(':id/community-score')
  updateCommunityScore(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommunityScoreDto,
  ) {
    return this.trainingEvaluationsService.updateCommunityScore(
      request.user,
      id,
      dto,
    );
  }

  @Get(':id/role-score')
  getRoleScore(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingEvaluationsService.getRoleScore(request.user, id);
  }

  @Patch(':id/role-score')
  updateRoleScore(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleScoreDto,
  ) {
    return this.trainingEvaluationsService.updateRoleScore(
      request.user,
      id,
      dto,
    );
  }
}
