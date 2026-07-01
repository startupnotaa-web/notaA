import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { StudyTrailsService } from './study-trails.service';

@Controller('study-trails')
export class StudyTrailsController {
  constructor(private readonly studyTrailsService: StudyTrailsService) {}

  @Get('generate')
  async generate(@Req() req: AuthenticatedRequest) {
    return this.studyTrailsService.generateTrail(req.user.sub);
  }
}
