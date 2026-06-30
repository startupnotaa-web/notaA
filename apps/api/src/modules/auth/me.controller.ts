import { Controller, Get, Req } from '@nestjs/common';
import type { MeResponse } from '@notaa/contracts';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';

// doc 05 §2 — GET /me, papéis: todos (sem @Roles() => qualquer papel autenticado).
@Controller('me')
export class MeController {
  @Get()
  getMe(@Req() request: AuthenticatedRequest): MeResponse {
    const { sub, email, app_metadata } = request.user;
    return {
      id: sub,
      // TODO (passo 9+): join com `usuario`/`assinatura`/`plano` via @notaa/db —
      // hoje só o que o JWT carrega está disponível (nome/plano exigem DB).
      nome: null,
      email: email ?? '',
      tipoPerfil: app_metadata.papel,
      escolaId: app_metadata.escola_id ?? null,
      plano: null,
    };
  }
}
