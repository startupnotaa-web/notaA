import { z } from 'zod';

// Estrutura de instituições, turmas e professores (perfis.md + perfis-decisoes.md).
// Termo da plataforma: "instituição", nunca "escola".

// ─── Ano letivo ──────────────────────────────────────────────────────────────

/**
 * O rótulo é GLOBAL da plataforma ("2026"); as datas são de cada dono, porque
 * calendário de instituição varia. Por isso rótulo e período são coisas
 * separadas no banco e aqui.
 */
export const AnoLetivoSchema = z.object({
  id: z.string().uuid(),
  rotulo: z.string(),
  /** Datas e arquivamento do SEU ano letivo. `null` = dono ainda não definiu. */
  dataInicio: z.string().nullable(),
  dataFim: z.string().nullable(),
  arquivado: z.boolean(),
});
export type AnoLetivo = z.infer<typeof AnoLetivoSchema>;

export const CriarAnoLetivoRequestSchema = z.object({
  rotulo: z.string().trim().min(2, 'Informe o ano letivo.').max(40),
  dataInicio: z.string().date().nullable().optional(),
  dataFim: z.string().date().nullable().optional(),
});
export type CriarAnoLetivoRequest = z.infer<typeof CriarAnoLetivoRequestSchema>;

export const AtualizarAnoLetivoRequestSchema = z
  .object({
    dataInicio: z.string().date().nullable().optional(),
    dataFim: z.string().date().nullable().optional(),
    /** Arquivar torna as turmas daquele ano somente leitura. */
    arquivado: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: 'Nada para atualizar.' });
export type AtualizarAnoLetivoRequest = z.infer<typeof AtualizarAnoLetivoRequestSchema>;

// ─── Turma ───────────────────────────────────────────────────────────────────

export const DonoDaTurmaSchema = z.object({
  tipo: z.enum(['instituicao', 'professor_independente']),
  nome: z.string(),
});
export type DonoDaTurma = z.infer<typeof DonoDaTurmaSchema>;

export const TurmaSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  anoLetivo: z.object({ id: z.string().uuid(), rotulo: z.string() }),
  arquivada: z.boolean(),
  /** Nulo até alguém gerar o convite. Só o dono da turma enxerga este campo. */
  codigoConvite: z.string().nullable(),
  codigoExpiraEm: z.string().nullable(),
  quantidadeDeProfessores: z.number().int().min(0),
  /** Alunos com matrícula ativa. Pendentes não contam. */
  quantidadeDeAlunos: z.number().int().min(0),
  solicitacoesPendentes: z.number().int().min(0),
  /** Falso enquanto a turma não tiver professor, ou se estiver arquivada. */
  aceitaAluno: z.boolean(),
});
export type Turma = z.infer<typeof TurmaSchema>;

/** perfis.md: a tela de criação tem um único campo, o nome. O ano é o atual. */
export const CriarTurmaRequestSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome da turma.').max(120),
  anoLetivoId: z.string().uuid(),
});
export type CriarTurmaRequest = z.infer<typeof CriarTurmaRequestSchema>;

export const AtualizarTurmaRequestSchema = z
  .object({
    nome: z.string().trim().min(2).max(120).optional(),
    arquivada: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: 'Nada para atualizar.' });
export type AtualizarTurmaRequest = z.infer<typeof AtualizarTurmaRequestSchema>;

export const VincularProfessorRequestSchema = z.object({
  professorId: z.string().uuid(),
});
export type VincularProfessorRequest = z.infer<typeof VincularProfessorRequestSchema>;

export const ProfessorDaTurmaSchema = z.object({
  professorId: z.string().uuid(),
  nome: z.string().nullable(),
  email: z.string(),
});
export type ProfessorDaTurma = z.infer<typeof ProfessorDaTurmaSchema>;

export const CodigoConviteSchema = z.object({
  codigoConvite: z.string(),
  codigoExpiraEm: z.string(),
});
export type CodigoConvite = z.infer<typeof CodigoConviteSchema>;

// ─── Entrada do aluno na turma ───────────────────────────────────────────────

/**
 * O que o aluno vê ANTES de confirmar (perfis.md): nome da turma e de quem é a
 * turma. Nenhum dado de outros alunos aparece aqui.
 */
export const PreviaConviteSchema = z.object({
  turmaId: z.string().uuid(),
  turmaNome: z.string(),
  anoLetivoRotulo: z.string(),
  dono: DonoDaTurmaSchema,
});
export type PreviaConvite = z.infer<typeof PreviaConviteSchema>;

/**
 * `consentimento` é obrigatoriamente `true`: o aluno autoriza, de forma
 * explícita e por turma, que aquela instituição ou professor veja o desempenho
 * que ele gerar a partir da aprovação. Sem isso o schema recusa a requisição.
 */
export const EntrarNaTurmaRequestSchema = z.object({
  codigo: z.string().trim().min(4).max(32),
  consentimento: z.literal(true, {
    errorMap: () => ({ message: 'É preciso consentir para entrar na turma.' }),
  }),
});
export type EntrarNaTurmaRequest = z.infer<typeof EntrarNaTurmaRequestSchema>;

export const MatriculaStatusSchema = z.enum(['pendente', 'ativa', 'recusada', 'removida']);
export type MatriculaStatus = z.infer<typeof MatriculaStatusSchema>;

/** Uma turma na visão do aluno, no perfil dele. */
export const MinhaTurmaSchema = z.object({
  turmaId: z.string().uuid(),
  turmaNome: z.string(),
  anoLetivoRotulo: z.string(),
  dono: DonoDaTurmaSchema,
  status: MatriculaStatusSchema,
  solicitadoEm: z.string(),
  aprovadoEm: z.string().nullable(),
});
export type MinhaTurma = z.infer<typeof MinhaTurmaSchema>;

export const SolicitacaoPendenteSchema = z.object({
  estudanteId: z.string().uuid(),
  nome: z.string().nullable(),
  solicitadoEm: z.string(),
});
export type SolicitacaoPendente = z.infer<typeof SolicitacaoPendenteSchema>;

/** Aprovar e recusar aceitam lote (perfis.md: "individualmente ou em lote"). */
export const DecidirSolicitacoesRequestSchema = z.object({
  estudanteIds: z.array(z.string().uuid()).min(1, 'Selecione pelo menos um aluno.').max(200),
});
export type DecidirSolicitacoesRequest = z.infer<typeof DecidirSolicitacoesRequestSchema>;

export const DecidirSolicitacoesResponseSchema = z.object({
  afetados: z.number().int().min(0),
});
export type DecidirSolicitacoesResponse = z.infer<typeof DecidirSolicitacoesResponseSchema>;

// ─── Alunos de uma turma, e o detalhe de um aluno ────────────────────────────

/** Um aluno na listagem DE UMA TURMA, com a janela daquela matrícula. */
export const AlunoDaTurmaSchema = z.object({
  estudanteId: z.string().uuid(),
  nome: z.string().nullable(),
  /** Data de aprovação nesta turma. Nada anterior a ela é exibido. */
  visivelDesde: z.string(),
  xpTotal: z.number().int().min(0),
  streak: z.number().int().min(0),
  risco: z.enum(['baixo', 'medio', 'alto']),
  motivo: z.string(),
  ultimoAcessoEm: z.string().nullable(),
});
export type AlunoDaTurma = z.infer<typeof AlunoDaTurmaSchema>;

export const DesempenhoPorAreaSchema = z.object({
  area: z.string(),
  tentativas: z.number().int().min(0),
  acertos: z.number().int().min(0),
  taxaAcerto: z.number().min(0).max(1),
});
export type DesempenhoPorArea = z.infer<typeof DesempenhoPorAreaSchema>;

/**
 * Temas em que o aluno errou, do mais frequente para o menos. Vem de
 * `tentativa_resposta.temas_erro`, gravado pelo detector de padrão de erro.
 */
export const TemaComErroSchema = z.object({
  tema: z.string(),
  erros: z.number().int().min(1),
});
export type TemaComErro = z.infer<typeof TemaComErroSchema>;

/** Uma semana na linha do tempo de uso. */
export const SemanaDeUsoSchema = z.object({
  /** Segunda-feira da semana, em ISO (só a data). */
  semana: z.string(),
  tentativas: z.number().int().min(0),
  acertos: z.number().int().min(0),
});
export type SemanaDeUso = z.infer<typeof SemanaDeUsoSchema>;

/**
 * Uma redação do aluno, com nota por competência e o texto.
 *
 * O texto entra por decisão explícita do usuário: fica apenas aqui, na visão
 * individual, dentro do bloco de redações. Não aparece em listagem nem em
 * agregado.
 */
export const RedacaoDoAlunoSchema = z.object({
  redacaoId: z.string().uuid(),
  tema: z.string(),
  enviadoEm: z.string(),
  notaTotal: z.number().int().min(0).max(1000).nullable(),
  competencias: z.array(
    z.object({
      competencia: z.number().int().min(1).max(5),
      nota: z.number().int().min(0).max(200),
      justificativa: z.string(),
    }),
  ),
  texto: z.string(),
});
export type RedacaoDoAluno = z.infer<typeof RedacaoDoAlunoSchema>;

export const DetalheDoAlunoSchema = z.object({
  estudanteId: z.string().uuid(),
  nome: z.string().nullable(),
  turmaNome: z.string(),
  visivelDesde: z.string(),
  xpTotal: z.number().int().min(0),
  streak: z.number().int().min(0),
  risco: z.enum(['baixo', 'medio', 'alto']),
  motivo: z.string(),
  ultimoAcessoEm: z.string().nullable(),
  totalTentativas: z.number().int().min(0),
  porArea: z.array(DesempenhoPorAreaSchema),
  temasComErro: z.array(TemaComErroSchema),
  usoPorSemana: z.array(SemanaDeUsoSchema),
  redacoes: z.array(RedacaoDoAlunoSchema),
});
export type DetalheDoAluno = z.infer<typeof DetalheDoAlunoSchema>;
