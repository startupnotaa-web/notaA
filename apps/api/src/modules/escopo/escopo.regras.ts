import type { Papel } from '@notaa/contracts';

/**
 * Núcleo puro das regras de escopo (perfis.md, seção Permissões).
 *
 * Mesma separação do `rbac.ts`: aqui não existe HTTP, NestJS nem banco. O RBAC
 * de rota responde "este papel pode entrar nesta rota?"; estas regras respondem
 * "este papel pode fazer isto?" e "este dado pode ser visto?", que dependem de
 * propriedade e de tempo, não só do papel.
 *
 * Tudo isto vale no SERVIDOR. Esconder no front não é autorização.
 */

/** Validade do código de convite de turma (perfis.md: uma semana). */
export const VALIDADE_CODIGO_CONVITE_DIAS = 7;

/**
 * Validade do convite de professor institucional.
 *
 * Não está em perfis.md — é escolha de engenharia. O link concede acesso
 * institucional, então precisa de prazo; duas semanas dá folga para a
 * instituição montar o quadro de professores sem transformar o link num
 * passe permanente.
 */
export const VALIDADE_CONVITE_PROFESSOR_DIAS = 14;

/** Os dois papéis que lecionam. Ambos acessam o painel do professor. */
export const PAPEIS_QUE_LECIONAM: readonly Papel[] = [
  'professor_institucional',
  'professor_independente',
];

/**
 * Quem cria turma: a instituição (para seus professores) e o professor
 * independente (para si). Professor VINCULADO a instituição não cria — ele só
 * leciona nas turmas que a instituição criar e atribuir a ele.
 *
 * O administrador da plataforma fica fora de propósito: criar turma é ato de
 * dono, e a plataforma não é dona de turma de ninguém.
 */
export function podeCriarTurma(papel: Papel): boolean {
  return papel === 'admin_instituicao' || papel === 'professor_independente';
}

/** Aprovar ou recusar solicitação de entrada: professor da turma ou admin da instituição. */
export function podeAprovarMatricula(papel: Papel): boolean {
  return papel === 'admin_instituicao' || PAPEIS_QUE_LECIONAM.includes(papel);
}

/** Gerenciar ano letivo (criar, datar, arquivar): quem é dono de turma. */
export function podeGerenciarAnoLetivo(papel: Papel): boolean {
  return podeCriarTurma(papel);
}

/**
 * Turma aceita aluno novo?
 *
 * perfis.md diz "não existe turma sem professor". Na prática a instituição cria
 * a turma e só depois vincula professores, então a regra executável é esta: sem
 * professor, a turma existe mas não recebe aluno. Turma arquivada é somente
 * leitura e também não recebe.
 */
export function turmaAceitaAluno(turma: {
  quantidadeDeProfessores: number;
  arquivada: boolean;
}): boolean {
  return turma.quantidadeDeProfessores > 0 && !turma.arquivada;
}

/** Quando expira um código gerado agora. */
export function calcularExpiracaoCodigo(agora: Date): Date {
  const expira = new Date(agora);
  expira.setDate(expira.getDate() + VALIDADE_CODIGO_CONVITE_DIAS);
  return expira;
}

/**
 * Código de convite serve para entrar?
 *
 * Expirar o código não afeta quem já está dentro (perfis.md): esta função
 * decide apenas se uma NOVA solicitação pode ser aberta. Para um aluno que
 * chega atrasado, o dono da turma gera outro código.
 */
export function codigoDeConviteValido(
  turma: { codigoConvite: string | null; codigoExpiraEm: Date | null },
  agora: Date,
): boolean {
  if (!turma.codigoConvite || !turma.codigoExpiraEm) return false;
  return turma.codigoExpiraEm.getTime() > agora.getTime();
}

/** Quando expira um convite de professor gerado agora. */
export function calcularExpiracaoConviteProfessor(agora: Date): Date {
  const expira = new Date(agora);
  expira.setDate(expira.getDate() + VALIDADE_CONVITE_PROFESSOR_DIAS);
  return expira;
}

/**
 * Convite de professor ainda serve?
 *
 * Três formas de morrer: prazo vencido, já usado, ou revogado pela instituição.
 * Todas levam à mesma recusa para quem abre o link.
 */
export function conviteProfessorValido(
  convite: { expiraEm: Date; usadoEm: Date | null; revogadoEm: Date | null },
  agora: Date,
): boolean {
  if (convite.usadoEm !== null || convite.revogadoEm !== null) return false;
  return convite.expiraEm.getTime() > agora.getTime();
}

export interface MatriculaParaJanela {
  status: 'pendente' | 'ativa' | 'recusada' | 'removida';
  aprovadoEm: Date | null;
}

/**
 * Desde quando o dado de um aluno pode ser visto — a JANELA DE DADOS.
 *
 * perfis.md: instituição e professor só veem o que o aluno gerou DEPOIS da
 * aprovação. Então a janela começa na aprovação, e só matrícula 'ativa' conta:
 * pendente é aluno que ainda não autorizou, recusada nunca entrou, removida
 * saiu.
 *
 * Recebendo matrículas de VÁRIAS turmas do mesmo observador, devolve a
 * aprovação mais ANTIGA — é o máximo que aquele observador pode ver somando as
 * turmas dele. `null` significa que não há nada visível.
 */
export function janelaDeDados(matriculas: readonly MatriculaParaJanela[]): Date | null {
  const inicios = matriculas
    .filter((m) => m.status === 'ativa' && m.aprovadoEm !== null)
    .map((m) => (m.aprovadoEm as Date).getTime());
  if (inicios.length === 0) return null;
  return new Date(Math.min(...inicios));
}

/**
 * Este dado do aluno é visível para quem tem esta janela?
 *
 * Sem janela, nada é visível. O limite é inclusivo: dado criado no mesmo
 * instante da aprovação conta como posterior.
 */
export function dadoEstaNaJanela(criadoEm: Date, janela: Date | null): boolean {
  if (janela === null) return false;
  return criadoEm.getTime() >= janela.getTime();
}
