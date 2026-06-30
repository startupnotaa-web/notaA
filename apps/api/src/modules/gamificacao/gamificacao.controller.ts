import { Controller, Get, Query, Req } from '@nestjs/common';
import { PaginationQuerySchema } from '@notaa/contracts';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GamificacaoService } from './gamificacao.service';

// doc 05 §5 — Gamificação (E9). Estudante só acessa o próprio `:meu` recurso
// (doc 10 §1) — estudanteId sempre vem de req.user.sub, nunca de params/query.
@Controller('me')
export class GamificacaoController {
  constructor(private readonly gamificacao: GamificacaoService) {}

  @Get('xp')
  async getXp(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: { cursor?: string; limit: number },
  ) {
    return this.gamificacao.getXpLedger(req.user.sub, query);
  }

  @Get('streak')
  getStreak(@Req() req: AuthenticatedRequest) {
    return this.gamificacao.getStreak(req.user.sub);
  }

  @Get('achievements')
  getAchievements(@Req() req: AuthenticatedRequest) {
    return this.gamificacao.getAchievements(req.user.sub);
  }
}
