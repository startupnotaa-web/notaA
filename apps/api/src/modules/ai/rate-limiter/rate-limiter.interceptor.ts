import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { Database, assinatura, contadorRateLimit, desc, eq, plano, sql } from '@notaa/db';
import { DB_CLIENT } from '../../../db/db.tokens';
import type { AuthenticatedRequest } from '../../../common/guards/auth.guard';

type Integracao = 'socratica' | 'redacao';

export const RATE_LIMIT_IA_KEY = 'rate_limit_ia_integracao';

/** Marca a rota como chamada de IA sujeita ao portão único (doc 06 §6). */
export const RateLimitIA = (integracao: Integracao) => SetMetadata(RATE_LIMIT_IA_KEY, integracao);

// 🔧 Calibração (doc 06 §6): limites do plano Free por DIA quando o plano não
// define `limites_ia` explícito. Plus/Escola sem chave explícita = sem limite.
const LIMITES_FREE_DIA: Record<Integracao, number> = {
  socratica: 20,
  redacao: 3,
};
const CHAVE_LIMITE: Record<Integracao, string> = {
  socratica: 'socratica_dia',
  redacao: 'redacao_dia',
};

/**
 * Portão único de toda chamada de IA (I2, doc 03 §4, doc 06 §6), agora com o
 * contador REAL persistido em `contador_rate_limit` (doc 04 §8, auditoria R2):
 * janela diária por usuário+integração, limite lido de `plano.limites_ia`.
 * Persistente = funciona em serverless (o Map em memória anterior zerava a
 * cada cold start e não limitava nada).
 *
 * Aplicar por rota com `@UseInterceptors(RateLimiterInterceptor)` +
 * `@RateLimitIA('socratica' | 'redacao')` — NUNCA globalmente.
 *
 * Falha de banco no contador é fail-open com log: o rate limiter não pode
 * derrubar o produto (a chamada de IA em si ainda falharia se o banco caiu).
 */
@Injectable()
export class RateLimiterInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RateLimiter');

  constructor(
    private readonly reflector: Reflector,
    @Inject(DB_CLIENT) private readonly db: Database,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const integracao = this.reflector.getAllAndOverride<Integracao | undefined>(RATE_LIMIT_IA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const usuarioId = request.user?.sub;
    if (!integracao || !usuarioId) return next.handle();

    let contagem: number | null = null;
    let limite: number | null = null;
    try {
      limite = await this.limiteDoPlano(usuarioId, integracao);
      if (limite === null) return next.handle(); // sem limite (plano pago sem chave explícita)

      contagem = await this.incrementarContador(usuarioId, integracao, limite);
    } catch (error) {
      this.logger.error(
        `Falha ao aplicar rate limit (usuario=${usuarioId}, integracao=${integracao}) — seguindo fail-open.`,
        error instanceof Error ? error.stack : String(error),
      );
      return next.handle();
    }

    if (contagem > limite) {
      // Resposta de NEGÓCIO, não erro técnico (doc 06 §6 / doc 05 §1).
      throw new HttpException(
        {
          error: {
            code: 'RATE_LIMIT_REACHED',
            message:
              'Você atingiu o limite diário de uso da IA do seu plano. O contador reinicia amanhã — ou conheça o plano Plus para limites maiores.',
          },
        },
        429,
      );
    }

    return next.handle();
  }

  /** Limite diário do plano do usuário; null = sem limite. Sem assinatura = Free. */
  private async limiteDoPlano(usuarioId: string, integracao: Integracao): Promise<number | null> {
    const [registro] = await this.db
      .select({ tipo: plano.tipo, limitesIa: plano.limitesIa })
      .from(assinatura)
      .innerJoin(plano, eq(plano.id, assinatura.planoId))
      .where(eq(assinatura.usuarioId, usuarioId))
      .orderBy(desc(assinatura.vigenciaInicio))
      .limit(1);

    const limitesIa = (registro?.limitesIa ?? {}) as Record<string, unknown>;
    const explicito = limitesIa[CHAVE_LIMITE[integracao]];
    if (typeof explicito === 'number') {
      return explicito <= 0 ? null : explicito; // 0/negativo no plano = ilimitado
    }

    const tipo = registro?.tipo ?? 'free';
    return tipo === 'free' ? LIMITES_FREE_DIA[integracao] : null;
  }

  /** UPSERT atômico do contador na janela diária (UTC) — devolve a contagem já incrementada. */
  private async incrementarContador(
    usuarioId: string,
    integracao: Integracao,
    limite: number,
  ): Promise<number> {
    const janelaInicio = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    const [row] = await this.db
      .insert(contadorRateLimit)
      .values({ usuarioId, integracao, janelaInicio, contagem: 1, limite })
      .onConflictDoUpdate({
        target: [contadorRateLimit.usuarioId, contadorRateLimit.integracao, contadorRateLimit.janelaInicio],
        set: { contagem: sql`${contadorRateLimit.contagem} + 1`, limite },
      })
      .returning({ contagem: contadorRateLimit.contagem });
    return row!.contagem;
  }
}
