import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

/**
 * Filtro global de exceções — captura TUDO que não foi tratado antes de chegar
 * ao cliente (doc 03 §4). Garante:
 *  1. Log completo com stack trace (essencial para debug nos logs da Vercel).
 *  2. Resposta JSON padronizada `{ error: { code, message } }` — consistente
 *     com o contrato que o frontend (`ApiError`) espera.
 *  3. Nunca vaza detalhes internos (stack/query) para o cliente em produção.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    // Se o NestJS já enviou a resposta (ex: streaming), não faz nada.
    if (reply.sent) return;

    let status: number;
    let code: string;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      // O NestJS pode devolver string ou objeto — normalizamos.
      if (typeof body === 'string') {
        code = HttpStatus[status] ?? 'UNKNOWN_ERROR';
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        const nested = obj.error as Record<string, unknown> | undefined;
        code = (nested?.code as string) ?? (obj.error as string) ?? HttpStatus[status] ?? 'UNKNOWN_ERROR';
        message = (nested?.message as string) ?? (obj.message as string) ?? 'Erro inesperado.';
      } else {
        code = 'UNKNOWN_ERROR';
        message = 'Erro inesperado.';
      }
    } else {
      // Erro não-HTTP (Drizzle, postgres.js, TypeError, etc.) — sempre 500.
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_SERVER_ERROR';
      message = 'Erro interno do servidor. Tente novamente em instantes.';
    }

    // Log completo — stack trace aparece nos logs da Vercel/Render.
    if (status >= 500) {
      this.logger.error(
        `[${status}] ${code}: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`[${status}] ${code}: ${message}`);
    }

    reply.status(status).send({ error: { code, message } });
  }
}
