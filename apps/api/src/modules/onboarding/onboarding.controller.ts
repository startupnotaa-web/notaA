import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { OnboardingService } from './onboarding.service';

// doc 05 §3 — Onboarding (E1), salvamento incremental (A6). Papéis: estudante
// (sem @Roles() — qualquer papel autenticado entra; a regra de "só estudante
// tem onboarding" é decisão de produto a refinar quando o Painel da Escola/Admin
// também precisar de fluxos próprios — por ora não bloqueamos aqui).
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('state')
  getState(@Req() req: AuthenticatedRequest) {
    return this.onboarding.getState(req.user.sub);
  }

  @Put('steps/:n')
  saveStep(
    @Req() req: AuthenticatedRequest,
    @Param('n', ParseIntPipe) n: number,
    @Body() body: unknown,
  ) {
    return this.onboarding.saveStep(req.user.sub, n, body);
  }

  @Post('complete')
  complete(@Req() req: AuthenticatedRequest) {
    return this.onboarding.complete(req.user.sub);
  }
}
