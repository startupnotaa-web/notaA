import { z } from 'zod';

// Painel da instituição: gestão de professores (perfis.md).

// ─── Convite de professor ────────────────────────────────────────────────────

/**
 * Um convite aberto. `token` vem no corpo porque a instituição precisa montar o
 * link para passar ao professor — a entrega é por link na tela, não por e-mail.
 */
export const ConviteProfessorSchema = z.object({
  id: z.string().uuid(),
  token: z.string(),
  /** Só registro de para quem o convite foi feito. Quem autoriza é o token. */
  email: z.string().nullable(),
  expiraEm: z.string(),
  criadoEm: z.string(),
});
export type ConviteProfessor = z.infer<typeof ConviteProfessorSchema>;

export const CriarConviteProfessorRequestSchema = z.object({
  email: z.string().email('E-mail inválido.').optional(),
});
export type CriarConviteProfessorRequest = z.infer<typeof CriarConviteProfessorRequestSchema>;

/**
 * O que quem abre o link vê ANTES de criar a conta. Só o nome da instituição:
 * nenhum dado de professor, aluno ou turma antes de a conta existir.
 */
export const PreviaConviteProfessorSchema = z.object({
  instituicaoNome: z.string(),
  /** Preenchido quando o convite foi feito para um e-mail específico. */
  email: z.string().nullable(),
});
export type PreviaConviteProfessor = z.infer<typeof PreviaConviteProfessorSchema>;

/**
 * Cadastro de professor institucional. Não passa pelo formulário público: o
 * papel e a instituição vêm do token, nunca do corpo da requisição, senão
 * qualquer pessoa se declararia professor de qualquer instituição.
 */
export const RegistrarProfessorRequestSchema = z.object({
  nome: z.string().trim().min(1, 'Informe seu nome.').max(120),
  email: z.string().email(),
  token: z.string().min(16),
});
export type RegistrarProfessorRequest = z.infer<typeof RegistrarProfessorRequestSchema>;

// ─── Professores da instituição ──────────────────────────────────────────────

export const ProfessorDaInstituicaoSchema = z.object({
  professorId: z.string().uuid(),
  nome: z.string().nullable(),
  email: z.string(),
  quantidadeDeTurmas: z.number().int().min(0),
  /** Turmas em que ele é o ÚNICO professor — removê-lo deixaria essas sem ninguém. */
  turmasQueFicariamSemProfessor: z.array(
    z.object({ id: z.string().uuid(), nome: z.string() }),
  ),
});
export type ProfessorDaInstituicao = z.infer<typeof ProfessorDaInstituicaoSchema>;

export const RemoverProfessorResponseSchema = z.object({
  removido: z.boolean(),
});
export type RemoverProfessorResponse = z.infer<typeof RemoverProfessorResponseSchema>;

// ─── Visão geral da instituição ──────────────────────────────────────────────

export const AreaMaisFragilSchema = z
  .object({ area: z.string(), mediaAcertos: z.number() })
  .nullable();

/**
 * Indicadores de uma turma. Desempenho, engajamento e alunos ativos, como
 * perfis.md pede.
 *
 * NÃO carrega nada sobre o professor de propósito: perfis.md proíbe comparativo
 * e ranking entre professores, e a forma mais segura de não construir um é não
 * entregar o dado que permitiria montá-lo.
 */
export const IndicadorDeTurmaSchema = z.object({
  turmaId: z.string().uuid(),
  nome: z.string(),
  anoLetivoRotulo: z.string(),
  alunosAtivos: z.number().int().min(0),
  /** Alunos sem nenhuma atividade nos últimos 7 dias, incluindo quem nunca teve. */
  alunosSemAcesso7d: z.number().int().min(0),
  solicitacoesPendentes: z.number().int().min(0),
  mediaXp: z.number().int().min(0),
  areaMaisFragil: AreaMaisFragilSchema,
});
export type IndicadorDeTurma = z.infer<typeof IndicadorDeTurmaSchema>;

export const InstituicaoOverviewSchema = z.object({
  instituicaoNome: z.string(),
  totalTurmas: z.number().int().min(0),
  totalProfessores: z.number().int().min(0),
  /** Alunos com matrícula ativa. Pendentes não contam: ainda não autorizaram. */
  totalAlunos: z.number().int().min(0),
  solicitacoesPendentes: z.number().int().min(0),
  mediaXp: z.number().int().min(0),
  areaMaisFragil: AreaMaisFragilSchema,
  turmas: z.array(IndicadorDeTurmaSchema),
});
export type InstituicaoOverview = z.infer<typeof InstituicaoOverviewSchema>;

export const AlunoDaInstituicaoSchema = z.object({
  estudanteId: z.string().uuid(),
  nome: z.string().nullable(),
  turmas: z.array(z.object({ id: z.string().uuid(), nome: z.string() })),
  /** Início da janela: nada anterior a isto é mostrado sobre este aluno. */
  visivelDesde: z.string(),
  xpTotal: z.number().int().min(0),
  streak: z.number().int().min(0),
  risco: z.enum(['baixo', 'medio', 'alto']),
  motivo: z.string(),
  ultimoAcessoEm: z.string().nullable(),
});
export type AlunoDaInstituicao = z.infer<typeof AlunoDaInstituicaoSchema>;
