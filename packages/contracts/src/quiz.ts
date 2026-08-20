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

/**
 * Quantidade de questões de uma sessão de quiz. Fonte única: a API decide o fim
 * (devolve `proximaQuestao: null` ao atingir o total) e o cliente usa o mesmo
 * número para a barra de progresso, sem duplicar a regra.
 */
export const QUIZ_TOTAL_QUESTOES = 10;

export const SubmitAnswerResponseSchema = z.object({
  acerto: z.boolean(),
  /**
   * Id da alternativa correta (ex.: 'B'). Revelado SÓ na resposta — ItemPublico
   * continua sem gabarito (H2.1). Sem isto o aluno que erra não descobre qual
   * era a certa, que é justamente o momento em que ele aprende.
   */
  gabarito: z.string(),
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

export const GenerateQuizRequestSchema = z.object({
  tema: z.string().min(1),
  area: AreaConhecimentoSchema,
  dificuldadeDesejada: z.enum(['Fácil', 'Média', 'Difícil']).optional(),
});
export type GenerateQuizRequest = z.infer<typeof GenerateQuizRequestSchema>;

export const GenerateQuizResponseSchema = z.object({
  enunciado: z.string(),
  alternativas: z.array(z.string()).length(5),
  correta: z.number().min(0).max(4),
  explicacao: z.string(),
  // camelCase como todo o resto dos contratos (redacao.ts, simulado.ts) — a
  // divergência snake_case já quebrou a validação Zod uma vez (auditoria E4).
  dicaPerfil: z.string(),
  dificuldade: z.enum(['Fácil', 'Média', 'Difícil']),
});
export type GenerateQuizResponse = z.infer<typeof GenerateQuizResponseSchema>;
