import { z } from 'zod';
import { RegraAvaliativaSchema } from './regra-avaliativa';

// Configuração acadêmica da instituição (Gestão Acadêmica, Fase 1):
// períodos avaliativos, disciplinas, atribuição turma–disciplina–professor e
// versões da regra avaliativa. Só admin de instituição configura; professor
// institucional lê a regra ativa.

/** Função do admin de instituição. Coordenação configura, mas não exporta nem audita. */
export const FuncaoInstituicaoSchema = z.enum(['gestor', 'coordenacao']);
export type FuncaoInstituicao = z.infer<typeof FuncaoInstituicaoSchema>;

/** As quatro áreas do ENEM e redação. As trilhas da plataforma (fin, soc, art) ficam de fora. */
export const AreaEnemSchema = z.enum(['linguagens', 'humanas', 'natureza', 'matematica', 'redacao']);
export type AreaEnem = z.infer<typeof AreaEnemSchema>;

const DataSchema = z.string().date('Data inválida.');

export const AnoLetivoQuerySchema = z.object({ anoLetivoId: z.string().uuid() });
export type AnoLetivoQuery = z.infer<typeof AnoLetivoQuerySchema>;

// ─── Períodos ────────────────────────────────────────────────────────────────

export const PeriodoAvaliativoSchema = z.object({
  id: z.string().uuid(),
  anoLetivoId: z.string().uuid(),
  ordem: z.number().int(),
  nome: z.string(),
  dataInicio: z.string(),
  dataFim: z.string(),
});
export type PeriodoAvaliativo = z.infer<typeof PeriodoAvaliativoSchema>;

const datasEmOrdem = (b: { dataInicio?: string; dataFim?: string }) =>
  !b.dataInicio || !b.dataFim || b.dataFim > b.dataInicio;

export const CriarPeriodoAvaliativoRequestSchema = z
  .object({
    anoLetivoId: z.string().uuid(),
    ordem: z.number().int().min(1).max(12),
    nome: z.string().trim().min(2, 'Informe o nome do período.').max(60),
    dataInicio: DataSchema,
    dataFim: DataSchema,
  })
  .refine(datasEmOrdem, { message: 'O fim precisa ser depois do início.', path: ['dataFim'] });
export type CriarPeriodoAvaliativoRequest = z.infer<typeof CriarPeriodoAvaliativoRequestSchema>;

export const AtualizarPeriodoAvaliativoRequestSchema = z
  .object({
    ordem: z.number().int().min(1).max(12).optional(),
    nome: z.string().trim().min(2).max(60).optional(),
    dataInicio: DataSchema.optional(),
    dataFim: DataSchema.optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: 'Nada para atualizar.' })
  .refine(datasEmOrdem, { message: 'O fim precisa ser depois do início.', path: ['dataFim'] });
export type AtualizarPeriodoAvaliativoRequest = z.infer<typeof AtualizarPeriodoAvaliativoRequestSchema>;

// ─── Disciplinas ─────────────────────────────────────────────────────────────

export const DisciplinaSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  codigo: z.string().nullable(),
  areaEnem: AreaEnemSchema.nullable(),
  arquivada: z.boolean(),
});
export type Disciplina = z.infer<typeof DisciplinaSchema>;

export const CriarDisciplinaRequestSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome da disciplina.').max(80),
  codigo: z.string().trim().max(20).nullable().optional(),
  areaEnem: AreaEnemSchema.nullable().optional(),
});
export type CriarDisciplinaRequest = z.infer<typeof CriarDisciplinaRequestSchema>;

export const AtualizarDisciplinaRequestSchema = z
  .object({
    nome: z.string().trim().min(2).max(80).optional(),
    codigo: z.string().trim().max(20).nullable().optional(),
    areaEnem: AreaEnemSchema.nullable().optional(),
    /** Disciplina não é apagada: é arquivada, porque notas futuras apontam para ela. */
    arquivada: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: 'Nada para atualizar.' });
export type AtualizarDisciplinaRequest = z.infer<typeof AtualizarDisciplinaRequestSchema>;

// ─── Turma × disciplina × professor ─────────────────────────────────────────

export const TurmaDisciplinaSchema = z.object({
  turmaId: z.string().uuid(),
  disciplina: z.object({ id: z.string().uuid(), nome: z.string(), areaEnem: AreaEnemSchema.nullable() }),
  professor: z.object({ id: z.string().uuid(), nome: z.string().nullable() }).nullable(),
});
export type TurmaDisciplina = z.infer<typeof TurmaDisciplinaSchema>;

export const AtribuirDisciplinaRequestSchema = z.object({
  /** `null` = disciplina na turma, ainda sem professor. */
  professorId: z.string().uuid().nullable(),
});
export type AtribuirDisciplinaRequest = z.infer<typeof AtribuirDisciplinaRequestSchema>;

// ─── Regra avaliativa versionada ────────────────────────────────────────────

export const RegraAvaliativaVersaoSchema = z.object({
  id: z.string().uuid(),
  anoLetivoId: z.string().uuid(),
  versao: z.number().int(),
  regra: RegraAvaliativaSchema,
  criadoEm: z.string(),
  criadoPor: z.object({ id: z.string().uuid(), nome: z.string().nullable() }),
  /** Esta é a versão vigente (a da ativação mais recente)? */
  ativa: z.boolean(),
  /** Última vez que esta versão foi ativada. */
  ativadaEm: z.string().nullable(),
});
export type RegraAvaliativaVersao = z.infer<typeof RegraAvaliativaVersaoSchema>;

/**
 * Motivo de criar ou ativar uma versão da regra. Fica na trilha de auditoria,
 * que é imutável: é o que explica, depois, por que a nota mudou de regra.
 */
export const TAMANHO_MINIMO_JUSTIFICATIVA = 15;
export const JustificativaSchema = z
  .string()
  .trim()
  .min(TAMANHO_MINIMO_JUSTIFICATIVA, `Explique o motivo em pelo menos ${TAMANHO_MINIMO_JUSTIFICATIVA} caracteres.`)
  .max(500, 'Use até 500 caracteres.');

export const CriarRegraAvaliativaRequestSchema = z.object({
  anoLetivoId: z.string().uuid(),
  regra: RegraAvaliativaSchema,
  justificativa: JustificativaSchema,
});
export type CriarRegraAvaliativaRequest = z.infer<typeof CriarRegraAvaliativaRequestSchema>;

export const AtivarRegraRequestSchema = z.object({ justificativa: JustificativaSchema });
export type AtivarRegraRequest = z.infer<typeof AtivarRegraRequestSchema>;
