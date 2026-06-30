import { Controller, Get, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { DashboardService } from './dashboard.service';

// doc 05 §5 — Dashboard Core (E4): estimativa de nota, evolução de θ, streak, XP.
@Controller('me')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard')
  getDashboard(@Req() req: AuthenticatedRequest) {
    return this.dashboard.getDashboard(req.user.sub);
  }
}
