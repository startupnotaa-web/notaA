import { z } from 'zod';

// doc 05 §6 — Redação (E7), contrato central de I4/I5 (doc 06 §3).
// Guardrails que este schema impõe estruturalmente:
//   I4 — exatamente 5 competências, sempre as 5, nunca juízo fora da rubrica.
//   G-R2 — citações sempre carregam offsets (inicio/fim) no próprio texto.

export const EssayCitationSchema = z.object({
  trecho: z.string().min(1),
  inicio: z.number().int().min(0),
  fim: z.number().int().min(0),
  comentario: z.string(),
});
export type EssayCitation = z.infer<typeof EssayCitationSchema>;

// Níveis da rubrica oficial — Q-03, calibrável (doc 06 §3.2). Os valores abaixo
// são o esqueleto estrutural {0,40,80,120,160,200}; a rubrica em si (definicao
// jsonb em rubrica_redacao) é o que define qual nível corresponde a qual critério.
export const NotaCompetenciaSchema = z
  .number()
  .int()
  .min(0)
  .max(200)
  .refine((n) => n % 40 === 0, 'Nota deve ser um nível da rubrica: 0, 40, 80, 120, 160 ou 200.');

export const EssayCompetenciaSchema = z.object({
  competencia: z.number().int().min(1).max(5),
  titulo: z.string(),
  nota: NotaCompetenciaSchema,
  justificativa: z.string().min(1),
  citacoes: z.array(EssayCitationSchema), // citações do próprio texto (G-R2)
});
export type EssayCompetencia = z.infer<typeof EssayCompetenciaSchema>;

export const EssayFeedbackGeralSchema = z.object({
  pontosFortes: z.array(z.string()),
  pontosMelhoria: z.array(z.string()),
  proximoPasso: z.string(),
});
export type EssayFeedbackGeral = z.infer<typeof EssayFeedbackGeralSchema>;

export const RedacaoStatusSchema = z.enum([
  'em_correcao',
  'corrigida',
  'falha',
  'bloqueada_protocolo',
]);
export type RedacaoStatus = z.infer<typeof RedacaoStatusSchema>;

// Contrato de saída do Corretor — sempre as 5 competências (I4), nunca 4 nem 6.
export const EssayEvaluationSchema = z
  .object({
    redacaoId: z.string().uuid(),
    status: RedacaoStatusSchema,
    rubricaVersao: z.string(),
    motorVersao: z.string(),
    modeloVersao: z.string(),
    notaTotal: z.number().int().min(0).max(1000),
    competencias: z.array(EssayCompetenciaSchema).length(5),
    feedbackGeral: EssayFeedbackGeralSchema,
    criadoEm: z.string(),
  })
  .refine((e) => e.notaTotal === e.competencias.reduce((soma, c) => soma + c.nota, 0), {
    message: 'notaTotal deve ser a soma exata das 5 competências (doc 05 §6).',
  });
export type EssayEvaluation = z.infer<typeof EssayEvaluationSchema>;

export const CreateRedacaoRequestSchema = z
  .object({
    texto: z.string().min(1),
    temaId: z.string().uuid().optional(),
    temaLivre: z.string().optional(),
  })
  .refine((r) => !(r.temaId && r.temaLivre), {
    message: 'Informe temaId OU temaLivre, não ambos.',
  });
export type CreateRedacaoRequest = z.infer<typeof CreateRedacaoRequestSchema>;

export const CreateRedacaoResponseSchema = z.object({
  id: z.string().uuid(),
  status: RedacaoStatusSchema,
});
export type CreateRedacaoResponse = z.infer<typeof CreateRedacaoResponseSchema>;
