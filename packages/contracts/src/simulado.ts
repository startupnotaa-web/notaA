import { z } from 'zod';
import { AreaConhecimentoSchema } from './common';

// doc 08 §6 (E6) — Simulado Adaptativo multi-área. Diferente do Quiz (doc 05 §4),
// não usa o Motor TRI completo: seleciona por faixa de dificuldade estática
// (facil/media/dificil) num banco real de questões do ENEM (Missão 2).

export const DificuldadeTriSchema = z.enum(['facil', 'media', 'dificil']);
export type DificuldadeTri = z.infer<typeof DificuldadeTriSchema>;

export const QuestaoSimuladoAlternativaSchema = z.object({
  id: z.string(),
  texto: z.string(),
  correta: z.boolean(),
});

export const QuestaoSimuladoResponseSchema = z.object({
  id: z.string().uuid(),
  area: AreaConhecimentoSchema,
  enunciado: z.string(),
  alternativas: z.array(QuestaoSimuladoAlternativaSchema),
  nivel: z.number().int().min(1).max(3),
  explicacao: z.string(),
  dicaPerfil: z.string(),
  imagemUrl: z.string().nullable(),
});
export type QuestaoSimuladoResponse = z.infer<typeof QuestaoSimuladoResponseSchema>;

// Payload de ingestão do banco real do ENEM (Missão 2 — enem-extractor).
// Restrito a `admin` no controller; nunca exposto ao fluxo do estudante.
export const ImportQuestaoEnemSchema = z.object({
  area: AreaConhecimentoSchema,
  ano: z.number().int().positive().optional(),
  textoBase: z.string().nullable().optional(),
  enunciado: z.string().min(1),
  alternativas: z.array(z.string().min(1)).min(2).max(5),
  correta: z.number().int().min(0).max(4),
  dificuldadeTri: DificuldadeTriSchema.optional(),
  habilidadeBncc: z.string().optional(),
  imagemUrl: z.string().optional(),
});
export type ImportQuestaoEnem = z.infer<typeof ImportQuestaoEnemSchema>;

export const ImportQuestoesEnemRequestSchema = z.union([
  z.array(ImportQuestaoEnemSchema).min(1),
  z.object({ questoes: z.array(ImportQuestaoEnemSchema).min(1) }),
]);
export type ImportQuestoesEnemRequest = z.infer<typeof ImportQuestoesEnemRequestSchema>;

// ── Simulado com sessão (bloco fechado, correção só no fim) ──────────────────

/** Áreas que compõem a prova — as mesmas 4 do ENEM. */
export const SIMULADO_AREAS = ['linguagens', 'humanas', 'natureza', 'matematica'] as const;
export const SIMULADO_QUESTOES_POR_AREA = 10;
export const SIMULADO_TOTAL_QUESTOES = SIMULADO_AREAS.length * SIMULADO_QUESTOES_POR_AREA;

/** Só estes limites são aceitos — o XP é calibrado em cima deles. */
export const SIMULADO_LIMITES_MINUTOS = [60, 90] as const;

export const SimuladoModoSchema = z.enum(['cronometrado', 'livre']);
export type SimuladoModo = z.infer<typeof SimuladoModoSchema>;

export const StartSimuladoRequestSchema = z
  .object({
    modo: SimuladoModoSchema,
    limiteMinutos: z.union([z.literal(60), z.literal(90)]).optional(),
  })
  .refine((v) => (v.modo === 'cronometrado' ? v.limiteMinutos !== undefined : true), {
    message: 'modo "cronometrado" exige limiteMinutos (60 ou 90).',
    path: ['limiteMinutos'],
  });
export type StartSimuladoRequest = z.infer<typeof StartSimuladoRequestSchema>;

/** Questão como o aluno a recebe: SEM `correta` em qualquer alternativa. */
export const QuestaoSimuladoPublicaSchema = z.object({
  itemId: z.string().uuid(),
  ordem: z.number().int().positive(),
  area: AreaConhecimentoSchema,
  enunciado: z.string(),
  alternativas: z.array(z.object({ id: z.string(), texto: z.string() })),
  imagemUrl: z.string().nullable(),
});
export type QuestaoSimuladoPublica = z.infer<typeof QuestaoSimuladoPublicaSchema>;

export const StartSimuladoResponseSchema = z.object({
  sessaoId: z.string().uuid(),
  modo: SimuladoModoSchema,
  limiteMinutos: z.number().int().nullable(),
  /** ISO 8601; null no modo livre. Prazo é do servidor, não do cliente. */
  expiraEm: z.string().nullable(),
  questoes: z.array(QuestaoSimuladoPublicaSchema),
});
export type StartSimuladoResponse = z.infer<typeof StartSimuladoResponseSchema>;

/**
 * Retomada de uma prova em andamento (recarregou a página, caiu a internet,
 * trocou de aba). Devolve a mesma prova — mesma ordem, mesmas questões, ainda
 * sem gabarito — mais o que já foi respondido. O prazo continua sendo o
 * `expiraEm` gravado no início: sair da tela não devolve tempo.
 */
export const ResumeSimuladoResponseSchema = StartSimuladoResponseSchema.extend({
  /** itemId → id da alternativa marcada. Questão ausente = ainda em branco. */
  respostas: z.record(z.string(), z.string()),
  /** Já finalizada: o cliente deve ir direto ao relatório. */
  finalizado: z.boolean(),
  /** O prazo estourou enquanto o aluno estava fora — só resta finalizar. */
  expirado: z.boolean(),
});
export type ResumeSimuladoResponse = z.infer<typeof ResumeSimuladoResponseSchema>;

export const SaveSimuladoAnswerRequestSchema = z.object({
  itemId: z.string().uuid(),
  respostaId: z.string().min(1),
  tempoRespostaMs: z.number().int().nonnegative(),
});
export type SaveSimuladoAnswerRequest = z.infer<typeof SaveSimuladoAnswerRequestSchema>;

/** Resposta do save: confirma o registro e NÃO revela acerto (H2.1). */
export const SaveSimuladoAnswerResponseSchema = z.object({
  registrada: z.boolean(),
  respondidas: z.number().int().nonnegative(),
  total: z.number().int().positive(),
});
export type SaveSimuladoAnswerResponse = z.infer<typeof SaveSimuladoAnswerResponseSchema>;

export const SimuladoRecorteSchema = z.object({
  chave: z.string(),
  acertos: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  percentual: z.number(),
});
export type SimuladoRecorte = z.infer<typeof SimuladoRecorteSchema>;

export const SimuladoQuestaoRevisaoSchema = z.object({
  itemId: z.string().uuid(),
  ordem: z.number().int().positive(),
  area: AreaConhecimentoSchema,
  dificuldade: DificuldadeTriSchema,
  origem: z.enum(['enem', 'ia']),
  enunciado: z.string(),
  alternativas: z.array(z.object({ id: z.string(), texto: z.string() })),
  gabarito: z.string(),
  /** null = deixada em branco (conta como erro). */
  respostaDada: z.string().nullable(),
  acerto: z.boolean(),
});
export type SimuladoQuestaoRevisao = z.infer<typeof SimuladoQuestaoRevisaoSchema>;

export const SimuladoRelatorioSchema = z.object({
  sessaoId: z.string().uuid(),
  modo: SimuladoModoSchema,
  limiteMinutos: z.number().int().nullable(),
  expirado: z.boolean(),
  total: z.number().int().positive(),
  acertos: z.number().int().nonnegative(),
  emBranco: z.number().int().nonnegative(),
  percentual: z.number(),
  duracaoSegundos: z.number().int().nonnegative(),
  xpGanho: z.number().int().nonnegative(),
  /** Motivo de XP zerado no modo livre — o cliente explica ao aluno. */
  xpBloqueadoPorDesempenho: z.boolean(),
  porArea: z.array(SimuladoRecorteSchema),
  porDificuldade: z.array(SimuladoRecorteSchema),
  melhorArea: z.string().nullable(),
  areaAMelhorar: z.string().nullable(),
  questoes: z.array(SimuladoQuestaoRevisaoSchema),
});
export type SimuladoRelatorio = z.infer<typeof SimuladoRelatorioSchema>;
