import { Body, Controller, Post, Req } from '@nestjs/common';
import {
  MatchmakeRequestSchema,
  FinishBattleRequestSchema,
  type FinishBattleRequest,
  type MatchmakeRequest,
} from '@notaa/contracts';
import { RequiresFeature } from '../../common/decorators/feature.decorator';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BattleService } from './battle.service';

/**
 * Arena — oculta enquanto FEATURE_ARENA não estiver ligada
 * (common/feature-flags.ts). Esconder só a tela não bastaria: `matchmake` gera
 * questões pelo Gemini quando não encontra um oponente, então uma requisição
 * montada na mão consumiria quota de IA de uma funcionalidade que não está no
 * ar. Com a flag desligada, o FeatureGuard responde 404 antes de qualquer
 * chamada à IA.
 *
 * O módulo segue registrado no AppModule de propósito: as rotas continuam
 * enumeráveis pelo guard-rail de RBAC (route-roles-sync.test.ts) e nenhuma
 * entrada de ROUTE_ROLES precisa sair para ocultar a funcionalidade.
 */
@Controller('battle')
@RequiresFeature('arena')
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  @Post('matchmake')
  matchmake(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(MatchmakeRequestSchema))
    body: MatchmakeRequest,
  ) {
    return this.battleService.matchmake(req.user.sub, body.area);
  }

  @Post('finish')
  finish(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(FinishBattleRequestSchema))
    body: FinishBattleRequest,
  ) {
    return this.battleService.finishBattle(req.user.sub, body);
  }
}
