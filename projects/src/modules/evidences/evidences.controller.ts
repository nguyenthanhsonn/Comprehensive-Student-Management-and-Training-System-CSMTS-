import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LinkEvidenceUrlDto } from './dto/link-evidence-url.dto';
import { EvidencesService } from './evidences.service';

@Controller('evidences')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Student)
export class EvidencesController {
  constructor(private readonly evidencesService: EvidencesService) {}

  @Post('link-url')
  linkUrl(
    @CurrentUser('id') userId: string,
    @Body() dto: LinkEvidenceUrlDto,
  ) {
    return this.evidencesService.linkUrl(userId, dto);
  }

  @Get('my')
  findMine(@CurrentUser('id') userId: string) {
    return this.evidencesService.findMine(userId);
  }

  @Delete(':id')
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.evidencesService.remove(userId, id);
  }
}
