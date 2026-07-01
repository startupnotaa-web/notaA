import { z } from 'zod';

// Envelope único de erro de negócio (doc 05 §1) — nunca expor stack trace ao cliente.
export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN_ROLE',
  'RATE_LIMIT_REACHED',
  'AI_PROVIDER_UNAVAILABLE',
  'RISK_PROTOCOL_TRIGGERED',
  'NOT_FOUND',
  'CONFLICT',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

/**
 * Erro de negócio: violação de unicidade de e-mail ao criar `usuario`
 * (uq_usuario_email). Lançado pelo adaptador de persistência (packages/db) —
 * não carrega nenhum detalhe de driver (Postgres/Drizzle), só o e-mail em
 * conflito, para a camada de Orquestração (AuthService) decidir o que fazer:
 * (a) corrida entre duas chamadas concorrentes com o MESMO auth_uid
 * (idempotência — re-consultar resolve), ou (b) o e-mail já pertence a OUTRO
 * auth_uid (ex.: cadastro por senha + login OAuth depois, sem linkagem de
 * conta no Supabase) — nesse caso não há como prosseguir silenciosamente.
 */
export class EmailJaCadastradoError extends Error {
  constructor(public readonly email: string) {
    super(`E-mail já cadastrado: ${email}`);
    this.name = 'EmailJaCadastradoError';
  }
}
