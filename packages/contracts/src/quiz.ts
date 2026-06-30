import { z } from 'zod';
import { AreaConhecimentoSchema, ErroClassificacaoSchema } from './common';

// doc 05 §4 — Quiz adaptativo (E2).

// Questão entregue ao cliente — SEM gabarito (segurança, H2.1).
export const ItemPublicoSchema = z.object({
  itemId: z.string().uuid(),
  area: AreaConhecimentoSchema,
  enunciado: z.string(),
  alternativas: z.array(z.object({ id: z.string(), texto: z.string() })),
  numero: z.number().int().positive(),
});
export type ItemPublico = z.infer<typeof ItemPublicoSchema>;

// Gap preenchido nesta implementação: doc 05 §4 não especifica o corpo de
// POST /quiz/sessions. Área de conhecimento é indispensável para o Motor TRI
// selecionar item (doc 05 §9) — exigida aqui, não inventada como default
// silencioso.
export const StartQuizSessionRequestSchema = z.object({
  area: AreaConhecimentoSchema,
});
export type StartQuizSessionRequest = z.infer<typeof StartQuizSessionRequestSchema>;

export const StartQuizSessionResponseSchema = z.object({
  sessaoId: z.string().uuid(),
  primeiraQuestao: ItemPublicoSchema,
});
export type StartQuizSessionResponse = z.infer<typeof StartQuizSessionResponseSchema>;

export const SubmitAnswerRequestSchema = z.object({
  itemId: z.string().uuid(),
  respostaId: z.string(),
  tempoRespostaMs: z.number().int().positive(),
});
export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequestSchema>;

export const SubmitAnswerResponseSchema = z.object({
  acerto: z.boolean(),
  theta: z.number(),
  erroPadrao: z.number(),
  xpGanho: z.number().int(),
  // Gamificação (E9) — estado após o lançamento de XP, para o cliente comemorar.
  // `subiuDeNivel` dispara a animação de level-up no frontend.
  gamificacao: z.object({
    xpTotal: z.number().int(),
    nivel: z.number().int().min(1),
    subiuDeNivel: z.boolean(),
  }),
  feedback: z.object({ classificacaoErro: ErroClassificacaoSchema.nullable() }),
  proximaQuestao: ItemPublicoSchema.nullable(),
});
export type SubmitAnswerResponse = z.infer<typeof SubmitAnswerResponseSchema>;
