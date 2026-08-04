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
import { ConfirmReviewDto } from './dto/confirm-review.dto';
import { CreateTrainingEvaluationDto } from './dto/create-training-evaluation.dto';
import { ReturnEvaluationToStudentDto } from './dto/return-evaluation-to-student.dto';
import { ReviewScoresDto } from './dto/review-scores.dto';
import { ReviewTrainingEvaluationDto } from './dto/review-training-evaluation.dto';
import { SubmitClassToAdvisorDto } from './dto/submit-class-to-advisor.dto';
import { SubmitClassToFacultyDto } from './dto/submit-class-to-faculty.dto';
import { SubmitFacultyToTrainingDepartmentDto } from './dto/submit-faculty-to-training-department.dto';
import { UpdateActivityScoreDto } from './dto/update-activity-score.dto';
import { UpdateCommunityScoreDto } from './dto/update-community-score.dto';
import { UpdateDisciplineScoreDto } from './dto/update-discipline-score.dto';
import { UpdateRoleScoreDto } from './dto/update-role-score.dto';
import { UpdateStudyScoreDto } from './dto/update-study-score.dto';
import { UpdateTrainingEvaluationDraftDto } from './dto/update-training-evaluation-draft.dto';
import { TrainingEvaluationsService } from './training-evaluations.service';
import {
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

const ALL_ROLES = [
  UserRole.Student,
  UserRole.ClassLeader,
  UserRole.Advisor,
  UserRole.Faculty,
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

  @Get()
  @Roles(UserRole.Advisor, UserRole.ClassLeader, UserRole.Faculty, UserRole.Admin)
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

  @ApiOperation({
    summary: 'Lớp trưởng gửi toàn bộ phiếu trong lớp lên CVHT',
    description:
      'Chỉ lớp trưởng được gán lớp mới được gọi. BE chuyển các phiếu đang ở trạng thái submitted của lớp sang class_leader_approved để CVHT tiếp tục duyệt.',
  })
  @ApiResponse({ status: 201, description: 'Gửi danh sách lên CVHT thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post('classes/:classId/submit-to-advisor')
  @Roles(UserRole.ClassLeader)
  submitClassToAdvisor(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: SubmitClassToAdvisorDto,
  ) {
    return this.trainingEvaluationsService.submitClassToAdvisor(
      reviewer,
      classId,
      dto,
    );
  }

  @ApiOperation({
    summary: 'CVHT gửi toàn bộ phiếu trong lớp lên khoa',
    description:
      'Chỉ CVHT được gán lớp mới được gọi. BE chuyển các phiếu đang ở trạng thái class_leader_approved và đã có điểm CVHT sang class_approved để khoa/cấp trên tiếp tục xử lý.',
  })
  @ApiResponse({ status: 201, description: 'Gửi danh sách lên khoa thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post('classes/:classId/submit-to-faculty')
  @Roles(UserRole.Advisor)
  submitClassToFaculty(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: SubmitClassToFacultyDto,
  ) {
    return this.trainingEvaluationsService.submitClassToFaculty(
      reviewer,
      classId,
      dto,
    );
  }

  @ApiOperation({
    summary: 'Khoa gửi toàn bộ phiếu lên Phòng Đào tạo',
    description:
      'Chỉ tài khoản khoa được gán khoa mới được gọi. BE chuyển các phiếu class_approved trong khoa sang faculty_approved để PĐT duyệt cuối. Có thể truyền classId để gửi riêng một lớp.',
  })
  @ApiResponse({ status: 201, description: 'Gửi danh sách lên PĐT thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post('faculties/:facultyId/submit-to-training-department')
  @Roles(UserRole.Faculty)
  submitFacultyToTrainingDepartment(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('facultyId', ParseUUIDPipe) facultyId: string,
    @Body() dto: SubmitFacultyToTrainingDepartmentDto,
  ) {
    return this.trainingEvaluationsService.submitFacultyToTrainingDepartment(
      reviewer,
      facultyId,
      dto,
    );
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
  @Roles(UserRole.ClassLeader, UserRole.Advisor)
  reviewScores(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewScoresDto,
  ) {
    return this.trainingEvaluationsService.reviewScores(reviewer, id, dto);
  }

  @ApiOperation({
    summary: 'Xác nhận đã đánh giá phiếu',
    description:
      'Lớp trưởng/CVHT xác nhận đã hoàn tất cột điểm đánh giá cho một sinh viên. API chỉ ghi nhận người xác nhận và thời điểm xác nhận, chưa chuyển phiếu lên cấp tiếp theo.',
  })
  @ApiResponse({ status: 201, description: 'Xác nhận đánh giá thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post(':id/confirm-review')
  @Roles(UserRole.ClassLeader, UserRole.Advisor)
  confirmReview(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmReviewDto,
  ) {
    return this.trainingEvaluationsService.confirmReview(reviewer, id, dto);
  }

  @ApiOperation({
    summary: 'Tạo/Xử lý dữ liệu',
    description: 'Endpoint POST :id/review trong nhóm Training Evaluations; xem schema DTO/query và response mẫu trực tiếp trong Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Thao tác thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post(':id/review')
  @Roles(UserRole.Admin)
  review(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewTrainingEvaluationDto,
  ) {
    return this.trainingEvaluationsService.review(reviewer, id, dto);
  }

  @ApiOperation({
    summary: 'CVHT gửi lại phiếu đánh giá cho sinh viên',
    description:
      'Chỉ CVHT được gán lớp mới được gọi. Phiếu phải đang chờ CVHT duyệt; BE chuyển phiếu về rejected, lưu lý do vào note và gửi thông báo cho sinh viên.',
  })
  @ApiResponse({ status: 201, description: 'Gửi lại phiếu cho sinh viên thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ.' })
  @Post(':id/return-to-student')
  @Roles(UserRole.Advisor)
  returnToStudent(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnEvaluationToStudentDto,
  ) {
    return this.trainingEvaluationsService.returnToStudent(reviewer, id, dto);
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
