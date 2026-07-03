import { Controller, Get, HttpException, InternalServerErrorException, Logger, Post, Query, Req } from '@nestjs/common';
import { PaginationQuerySchema } from '@notaa/contracts';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GamificacaoService } from './gamificacao.service';

// doc 05 §5 — Gamificação (E9). Estudante só acessa o próprio `:meu` recurso
// (doc 10 §1) — estudanteId sempre vem de req.user.sub, nunca de params/query.
@Controller('me')
export class GamificacaoController {
  private readonly logger = new Logger(GamificacaoController.name);

  constructor(private readonly gamificacao: GamificacaoService) {}

  @Get('xp')
  async getXp(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: { cursor?: string; limit: number },
  ) {
    try {
      return await this.gamificacao.getXpLedger(req.user.sub, query);
    } catch (error) {
      // Erros de negócio (400/404/...) já vêm com o código certo do service —
      // não mascarar como 500 genérico.
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Falha ao buscar XP ledger para estudante ${req.user.sub}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException({
        error: { code: 'XP_LOAD_FAILED', message: 'Não foi possível carregar o histórico de XP.' },
      });
    }
  }

  @Get('streak')
  async getStreak(@Req() req: AuthenticatedRequest) {
    try {
      return await this.gamificacao.getStreak(req.user.sub);
    } catch (error) {
      // Erros de negócio (400/404/...) já vêm com o código certo do service —
      // não mascarar como 500 genérico.
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Falha ao buscar streak para estudante ${req.user.sub}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException({
        error: { code: 'STREAK_LOAD_FAILED', message: 'Não foi possível carregar a ofensiva.' },
      });
    }
  }

  @Post('recover-streak')
  async recoverStreak(@Req() req: AuthenticatedRequest) {
    try {
      return await this.gamificacao.recoverStreak(req.user.sub);
    } catch (error) {
      // Erros de negócio (400/404/...) já vêm com o código certo do service —
      // não mascarar como 500 genérico.
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Falha ao recuperar streak para estudante ${req.user.sub}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException({
        error: { code: 'STREAK_RECOVERY_FAILED', message: 'Não foi possível recuperar a ofensiva.' },
      });
    }
  }

  @Get('achievements')
  async getAchievements(@Req() req: AuthenticatedRequest) {
    try {
      return await this.gamificacao.getAchievements(req.user.sub);
    } catch (error) {
      // Erros de negócio (400/404/...) já vêm com o código certo do service —
      // não mascarar como 500 genérico.
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Falha ao buscar conquistas para estudante ${req.user.sub}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException({
        error: { code: 'ACHIEVEMENTS_LOAD_FAILED', message: 'Não foi possível carregar as conquistas.' },
      });
    }
  }
}

