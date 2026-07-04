import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

// Observabilidade (doc 10 §5, auditoria R7): Sentry captura exceções não
// tratadas da API. Ativado apenas quando SENTRY_DSN está definido — sem DSN a
// API funciona normalmente e este módulo vira no-op.

const logger = new Logger('Sentry');
let inicializado = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || inicializado) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
  inicializado = true;
  logger.log('Sentry inicializado.');
}

/**
 * Filtro global: erros 5xx (e qualquer exceção não-HTTP) vão para o Sentry;
 * erros 4xx são comportamento esperado do cliente e não geram evento. Depois
 * de capturar, delega ao filtro base do Nest — a resposta HTTP não muda.
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    const ehErroCliente = exception instanceof HttpException && exception.getStatus() < 500;
    if (inicializado && !ehErroCliente) {
      Sentry.captureException(exception);
    }
    super.catch(exception, host);
  }
}
