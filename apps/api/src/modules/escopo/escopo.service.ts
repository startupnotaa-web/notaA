import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  Database,
  and,
  eq,
  inArray,
  matriculaTurma,
  professorTurma,
  turma,
  usuario,
} from '@notaa/db';
import type { Papel } from '@notaa/contracts';
import { DB_CLIENT } from '../../db/db.tokens';
import { janelaDeDados, podeCriarTurma, type MatriculaParaJanela } from './escopo.regras';

/** Um aluno que o observador pode ver, e desde quando. */
export interface AlunoVisivel {
  estudanteId: string;
  /** Início da janela de dados: nada anterior a isto pode ser exibido. */
  visivelDesde: Date;
}

/**
 * Quem é dono de turma e de ano letivo. Exatamente um dos dois campos vem
 * preenchido — espelha as duas colunas exclusivas do banco.
 */
export type DonoDeTurma =
  | { instituicaoId: string; professorDonoId?: undefined }
  | { instituicaoId?: undefined; professorDonoId: string };

function proibido(mensagem: string): never {
  throw new ForbiddenException({ error: { code: 'FORA_DO_ESCOPO', message: mensagem } });
}

/**
 * Resolve ESCOPO: de quais turmas e de quais alunos um usuário pode ver dados,
 * e desde quando.
 *
 * Divisão de trabalho deliberada. O RBAC de rota (`rbac.ts` + guards) decide se
 * um PAPEL entra numa rota. Este serviço decide se ESTE usuário pode tocar
 * NESTE recurso — o que depende de propriedade e de datas, e por isso precisa
 * do banco. As regras em si vivem em `escopo.regras.ts`, puras e testadas; aqui
 * só mora a consulta.
 *
 * Toda rota de instituição e de professor deve passar por aqui. Filtrar só no
 * front não é autorização (perfis.md é explícito).
 */
@Injectable()
export class EscopoService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  /**
   * A instituição do usuário — para admin de instituição e professor
   * institucional. Falha se ele não tem vínculo, em vez de devolver nulo: quem
   * chama uma rota institucional sem instituição é erro de autorização, não um
   * caso vazio a ignorar.
   */
  async instituicaoDoUsuario(usuarioId: string): Promise<string> {
    const [linha] = await this.db
      .select({ instituicaoId: usuario.instituicaoId })
      .from(usuario)
      .where(eq(usuario.id, usuarioId))
      .limit(1);

    if (!linha?.instituicaoId) {
      proibido('Sua conta não está vinculada a nenhuma instituição.');
    }
    return linha.instituicaoId;
  }

  /**
   * Resolve quem é o dono para este usuário, a partir do papel dele.
   *
   * Admin de instituição é dono através da instituição; professor independente é
   * dono em nome próprio. Qualquer outro papel não é dono de nada e é recusado
   * aqui, uma vez só, em vez de cada rota repetir a checagem.
   */
  async donoDoUsuario(usuarioId: string, papel: Papel): Promise<DonoDeTurma> {
    if (!podeCriarTurma(papel)) {
      proibido('Seu papel não administra turmas.');
    }
    if (papel === 'professor_independente') {
      return { professorDonoId: usuarioId };
    }
    return { instituicaoId: await this.instituicaoDoUsuario(usuarioId) };
  }

  /** Turmas do escopo de quem administra: as da instituição ou as do professor dono. */
  async turmasDoDono(dono: DonoDeTurma, opcoes: { incluirArquivadas?: boolean } = {}) {
    return dono.instituicaoId !== undefined
      ? this.turmasDaInstituicao(dono.instituicaoId, opcoes)
      : this.turmasDoProfessorDono(dono.professorDonoId, opcoes);
  }

  /** Turmas em que o professor leciona. É o escopo inteiro do painel dele. */
  async turmasDoProfessor(
    professorId: string,
    opcoes: { incluirArquivadas?: boolean } = {},
  ): Promise<string[]> {
    const condicoes = [eq(professorTurma.professorId, professorId)];
    if (!opcoes.incluirArquivadas) condicoes.push(eq(turma.arquivada, false));

    const linhas = await this.db
      .select({ turmaId: turma.id })
      .from(professorTurma)
      .innerJoin(turma, eq(turma.id, professorTurma.turmaId))
      .where(and(...condicoes));

    return linhas.map((l) => l.turmaId);
  }

  /** Turmas da instituição. Admin de instituição vê todas as dela, e só as dela. */
  async turmasDaInstituicao(
    instituicaoId: string,
    opcoes: { incluirArquivadas?: boolean } = {},
  ): Promise<string[]> {
    const condicoes = [eq(turma.instituicaoId, instituicaoId)];
    if (!opcoes.incluirArquivadas) condicoes.push(eq(turma.arquivada, false));

    const linhas = await this.db.select({ turmaId: turma.id }).from(turma).where(and(...condicoes));
    return linhas.map((l) => l.turmaId);
  }

  /** Turmas que um professor independente possui (ele é o dono, não só quem leciona). */
  async turmasDoProfessorDono(
    professorId: string,
    opcoes: { incluirArquivadas?: boolean } = {},
  ): Promise<string[]> {
    const condicoes = [eq(turma.professorDonoId, professorId)];
    if (!opcoes.incluirArquivadas) condicoes.push(eq(turma.arquivada, false));

    const linhas = await this.db.select({ turmaId: turma.id }).from(turma).where(and(...condicoes));
    return linhas.map((l) => l.turmaId);
  }

  /** Garante que o professor leciona nesta turma antes de deixar ele agir sobre ela. */
  async assertProfessorNaTurma(professorId: string, turmaId: string): Promise<void> {
    const [linha] = await this.db
      .select({ turmaId: professorTurma.turmaId })
      .from(professorTurma)
      .where(and(eq(professorTurma.professorId, professorId), eq(professorTurma.turmaId, turmaId)))
      .limit(1);

    if (!linha) proibido('Você não leciona nesta turma.');
  }

  /**
   * Garante que a turma pertence a este dono. É o que impede uma instituição de
   * alcançar turma de outra trocando o id na requisição.
   */
  async assertTurmaDoDono(
    turmaId: string,
    dono: { instituicaoId?: string; professorDonoId?: string },
  ): Promise<void> {
    const [linha] = await this.db
      .select({ instituicaoId: turma.instituicaoId, professorDonoId: turma.professorDonoId })
      .from(turma)
      .where(eq(turma.id, turmaId))
      .limit(1);

    if (!linha) proibido('Turma não encontrada no seu escopo.');

    const daInstituicao =
      dono.instituicaoId !== undefined && linha.instituicaoId === dono.instituicaoId;
    const doProfessor =
      dono.professorDonoId !== undefined && linha.professorDonoId === dono.professorDonoId;

    if (!daInstituicao && !doProfessor) proibido('Esta turma não pertence ao seu escopo.');
  }

  /**
   * Alunos visíveis nestas turmas, cada um com o início da sua janela de dados.
   *
   * As linhas vêm cruas e a janela é calculada por `janelaDeDados`, a mesma
   * função testada que o resto do sistema usa. Resolver o mínimo em SQL daria
   * uma segunda implementação da regra mais sensível do produto — e duas
   * implementações é como elas divergem.
   */
  async alunosVisiveis(turmaIds: readonly string[]): Promise<AlunoVisivel[]> {
    if (turmaIds.length === 0) return [];

    const linhas = await this.db
      .select({
        estudanteId: matriculaTurma.estudanteId,
        status: matriculaTurma.status,
        aprovadoEm: matriculaTurma.aprovadoEm,
      })
      .from(matriculaTurma)
      .where(inArray(matriculaTurma.turmaId, [...turmaIds]));

    const porAluno = new Map<string, MatriculaParaJanela[]>();
    for (const l of linhas) {
      const lista = porAluno.get(l.estudanteId) ?? [];
      lista.push({ status: l.status, aprovadoEm: l.aprovadoEm });
      porAluno.set(l.estudanteId, lista);
    }

    const visiveis: AlunoVisivel[] = [];
    for (const [estudanteId, matriculas] of porAluno) {
      const janela = janelaDeDados(matriculas);
      if (janela !== null) visiveis.push({ estudanteId, visivelDesde: janela });
    }
    return visiveis;
  }

  /**
   * Janela de um aluno específico. Falha se ele não é visível — o observador não
   * deve conseguir distinguir "aluno inexistente" de "aluno fora do meu escopo".
   */
  async janelaDoAluno(estudanteId: string, turmaIds: readonly string[]): Promise<Date> {
    const visiveis = await this.alunosVisiveis(turmaIds);
    const encontrado = visiveis.find((v) => v.estudanteId === estudanteId);
    if (!encontrado) proibido('Este aluno não está no seu escopo.');
    return encontrado.visivelDesde;
  }
}
