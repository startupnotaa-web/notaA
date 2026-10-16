import { z } from 'zod';

// Importação de planilha (Gestão Acadêmica, Fase 1). Fluxo em quatro passos:
// 1. POST /importacoes → URL assinada; o navegador sobe o arquivo direto no Storage.
// 2. POST /importacoes/:id/arquivo-enviado → tipo real conferido, cabeçalhos e
//    sugestão de mapeamento. PUT /importacoes/:id/mapeamento salva o mapeamento.
// 3. GET /importacoes/:id/previa → o que cada linha vai fazer, e por quê.
// 4. POST /importacoes/:id/confirmar → o worker grava; GET /importacoes/:id
//    acompanha progresso e relatório.

export const LIMITE_IMPORTACAO_BYTES = 10 * 1024 * 1024;
export const LIMITE_IMPORTACAO_LINHAS = 5000;

export const TipoImportacaoSchema = z.enum(['alunos', 'disciplinas']);
export type TipoImportacao = z.infer<typeof TipoImportacaoSchema>;

export const StatusImportacaoSchema = z.enum([
  'aguardando_arquivo',
  'em_previa',
  'pendente',
  'processando',
  'concluida',
  'falhou',
]);
export type StatusImportacao = z.infer<typeof StatusImportacaoSchema>;

export const FormatoPlanilhaSchema = z.enum(['csv', 'xlsx']);
export type FormatoPlanilha = z.infer<typeof FormatoPlanilhaSchema>;

/** Um campo que a importação entende (ex.: `matricula`), com rótulo para a tela. */
export const CampoImportacaoSchema = z.object({
  campo: z.string(),
  rotulo: z.string(),
  obrigatorio: z.boolean(),
  descricao: z.string().nullable(),
});
export type CampoImportacao = z.infer<typeof CampoImportacaoSchema>;

/** campo → índice da coluna na planilha. `null` = campo não mapeado. */
export const MapeamentoColunasSchema = z.record(
  z.string().max(60),
  z.number().int().min(0).max(199).nullable(),
);
export type MapeamentoColunas = z.infer<typeof MapeamentoColunasSchema>;

export const CriarImportacaoRequestSchema = z.object({
  tipo: TipoImportacaoSchema,
  nomeArquivo: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/\.(csv|xlsx)$/i, 'Envie um arquivo .csv ou .xlsx.'),
  tamanhoBytes: z
    .number()
    .int()
    .positive()
    .max(LIMITE_IMPORTACAO_BYTES, 'O arquivo passa de 10 MB.'),
});
export type CriarImportacaoRequest = z.infer<typeof CriarImportacaoRequestSchema>;

export const CriarImportacaoResponseSchema = z.object({
  id: z.string().uuid(),
  /** URL assinada de upload, de uso único e curta duração. */
  uploadUrl: z.string().url(),
});
export type CriarImportacaoResponse = z.infer<typeof CriarImportacaoResponseSchema>;

export const ArquivoRecebidoResponseSchema = z.object({
  formato: FormatoPlanilhaSchema,
  totalLinhas: z.number().int(),
  cabecalhos: z.array(z.string()),
  campos: z.array(CampoImportacaoSchema),
  mapeamentoSugerido: MapeamentoColunasSchema,
});
export type ArquivoRecebidoResponse = z.infer<typeof ArquivoRecebidoResponseSchema>;

export const SalvarMapeamentoRequestSchema = z.object({ mapeamento: MapeamentoColunasSchema });
export type SalvarMapeamentoRequest = z.infer<typeof SalvarMapeamentoRequestSchema>;

export const AcaoLinhaSchema = z.enum(['criar', 'atualizar', 'sem_alteracao', 'recusar']);
export type AcaoLinha = z.infer<typeof AcaoLinhaSchema>;

export const LinhaPreviaSchema = z.object({
  /** Número da linha na planilha, contando o cabeçalho como linha 1. */
  linha: z.number().int(),
  acao: AcaoLinhaSchema,
  /** Matrícula do aluno ou nome da disciplina. */
  chave: z.string().nullable(),
  nome: z.string().nullable(),
  /** Por que foi recusada, ou o que muda numa atualização. */
  motivos: z.array(z.string()),
});
export type LinhaPrevia = z.infer<typeof LinhaPreviaSchema>;

export const ResumoImportacaoSchema = z.object({
  criar: z.number().int(),
  atualizar: z.number().int(),
  sem_alteracao: z.number().int(),
  recusar: z.number().int(),
});
export type ResumoImportacao = z.infer<typeof ResumoImportacaoSchema>;

export const PreviaQuerySchema = z.object({
  acao: AcaoLinhaSchema.optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(500).default(100),
});
export type PreviaQuery = z.infer<typeof PreviaQuerySchema>;

export const PreviaResponseSchema = z.object({
  resumo: ResumoImportacaoSchema,
  linhas: z.array(LinhaPreviaSchema),
  total: z.number().int(),
  pagina: z.number().int(),
  porPagina: z.number().int(),
});
export type PreviaResponse = z.infer<typeof PreviaResponseSchema>;

export const RelatorioImportacaoSchema = z.object({
  criados: z.number().int(),
  atualizados: z.number().int(),
  semAlteracao: z.number().int(),
  recusados: z.number().int(),
  responsaveisVinculados: z.number().int(),
  /** As linhas recusadas, com motivo, para a tela e para o download. */
  recusas: z.array(LinhaPreviaSchema),
});
export type RelatorioImportacao = z.infer<typeof RelatorioImportacaoSchema>;

export const ImportacaoSchema = z.object({
  id: z.string().uuid(),
  tipo: TipoImportacaoSchema,
  status: StatusImportacaoSchema,
  nomeArquivo: z.string(),
  formato: FormatoPlanilhaSchema.nullable(),
  totalLinhas: z.number().int().nullable(),
  linhasProcessadas: z.number().int(),
  cabecalhos: z.array(z.string()).nullable(),
  mapeamento: MapeamentoColunasSchema.nullable(),
  resumoPrevia: ResumoImportacaoSchema.nullable(),
  relatorio: RelatorioImportacaoSchema.nullable(),
  erro: z.string().nullable(),
  criadoEm: z.string(),
  concluidoEm: z.string().nullable(),
});
export type Importacao = z.infer<typeof ImportacaoSchema>;

export const TipoExportacaoSchema = z.enum(['alunos', 'disciplinas']);
export type TipoExportacao = z.infer<typeof TipoExportacaoSchema>;
