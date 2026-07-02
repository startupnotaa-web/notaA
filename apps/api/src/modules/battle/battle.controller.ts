import { Body, Controller, Post, Req } from '@nestjs/common';
import { MatchmakeRequestSchema, FinishBattleRequestSchema } from '@notaa/contracts';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BattleService } from './battle.service';

@Controller('battle')
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  @Post('matchmake')
  matchmake(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(MatchmakeRequestSchema))
    body: { area: 'linguagens' | 'humanas' | 'natureza' | 'matematica' },
  ) {
    return this.battleService.matchmake(req.user.sub, body.area);
  }

  @Post('finish')
  finish(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(FinishBattleRequestSchema))
    body: any,
  ) {
    return this.battleService.finishBattle(req.user.sub, body);
  }
}
