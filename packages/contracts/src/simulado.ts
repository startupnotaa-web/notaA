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
