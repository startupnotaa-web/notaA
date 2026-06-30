import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { AuthenticatedRequest } from '../../../common/guards/auth.guard';

/**
 * Portão único de toda chamada de IA (I2, doc 03 §4, doc 06 §6). Aplicar SÓ nos
 * controllers de Socrática e Corretor de Redação (Fase 2) — NUNCA globalmente,
 * já que a maioria das rotas não chama IA.
 *
 * ⚠️ Implementação ATUAL é um placeholder estrutural em memória — existe para
 * fixar o ponto único de interceptação antes que qualquer rota de IA exista.
 * O contador real por plano/janela (`ContadorRateLimit`, doc 04 §8) e a
 * resposta de negócio 429 (RATE_LIMIT_REACHED, doc 05 §1) entram quando
 * @notaa/db estiver injetado na API (a partir do passo 9) e o Context
 * Builder/LLMProviderPort existirem (Fase 2, doc 06).
 */
@Injectable()
export class RateLimiterInterceptor implements NestInterceptor {
  private readonly contagemEmMemoria = new Map<string, number>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const usuarioId = request.user?.sub ?? 'anonimo';
    this.contagemEmMemoria.set(usuarioId, (this.contagemEmMemoria.get(usuarioId) ?? 0) + 1);
    return next.handle();
  }
}
