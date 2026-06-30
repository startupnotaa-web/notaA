import { z } from 'zod';

// doc 05 §7 / doc 06 §2 — IA Socrática. A união discriminada por `tipo` restringe
// o FORMATO da resposta, NÃO o conteúdo: o guardrail I3 ("nunca a resposta direta")
// NÃO é garantido por este schema sozinho — a resposta final poderia viajar dentro
// de `mensagem` (texto livre). I3 depende de (a) prompt de sistema + (b) uma
// verificação de conteúdo pós-LLM (classificador/heurística que detecte solução
// final e force re-geração ou rebaixe para `degraded_static`) — ver docs/06 §2.3.
// PENDÊNCIA: essa verificação de conteúdo ainda não está implementada; não tratar
// a discriminação por `tipo` como enforcement de I3.

export const SocraticGuidanceSchema = z.object({
  tipo: z.literal('guidance'),
  mensagem: z.string().min(1),
  estado: z.string(), // nó da máquina de estados (doc 06 §2.1) — auditável
  passo: z.number().int().positive(),
});

export const SocraticRedirectSupportSchema = z.object({
  tipo: z.literal('redirect_support'),
  mensagem: z.string().min(1),
});

export const SocraticDegradedStaticSchema = z.object({
  tipo: z.literal('degraded_static'),
  mensagem: z.string().min(1),
  dicasEstaticas: z.array(z.string()),
});

export const SocraticCareProtocolSchema = z.object({
  tipo: z.literal('care_protocol'),
  mensagem: z.string().min(1),
  recursos: z.array(z.object({ nome: z.string(), contato: z.string(), url: z.string().url() })),
  escalonamento: z.enum(['responsavel_escola', 'flag_interno']),
});

export const SocraticResponseSchema = z.discriminatedUnion('tipo', [
  SocraticGuidanceSchema,
  SocraticRedirectSupportSchema,
  SocraticDegradedStaticSchema,
  SocraticCareProtocolSchema,
]);
export type SocraticResponse = z.infer<typeof SocraticResponseSchema>;

export const OpenSocraticSessionRequestSchema = z.object({
  temaAtivo: z.string().optional(),
  itemId: z.string().uuid().optional(),
});
export type OpenSocraticSessionRequest = z.infer<typeof OpenSocraticSessionRequestSchema>;

export const SendSocraticMessageRequestSchema = z.object({
  mensagem: z.string().min(1),
});
export type SendSocraticMessageRequest = z.infer<typeof SendSocraticMessageRequestSchema>;
