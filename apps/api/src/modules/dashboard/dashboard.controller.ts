import { Controller, Get, InternalServerErrorException, Logger, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { DashboardService } from './dashboard.service';

// doc 05 §5 — Dashboard Core (E4): estimativa de nota, evolução de θ, streak, XP.
@Controller('me')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard')
  async getDashboard(@Req() req: AuthenticatedRequest) {
    try {
      return await this.dashboard.getDashboard(req.user.sub);
    } catch (error) {
      this.logger.error(
        `Falha ao montar dashboard para estudante ${req.user.sub}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException({
        error: { code: 'DASHBOARD_LOAD_FAILED', message: 'Não foi possível carregar o painel.' },
      });
    }
  }
}
