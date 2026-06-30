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
