import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AlunoDaTurma,
  AtualizarTurmaRequest,
  CodigoConvite,
  CriarTurmaRequest,
  DecidirSolicitacoesResponse,
  DetalheDoAluno,
  MinhaTurma,
  Papel,
  PreviaConvite,
  ProfessorDaTurma,
  SolicitacaoPendente,
  Turma,
} from '@notaa/contracts';
import {
  Database,
  and,
  anoLetivo,
  anoLetivoPeriodo,
  asc,
  count,
  eq,
  inArray,
  instituicao,
  isNull,
  matriculaTurma,
  professorTurma,
  turma,
  usuario,
} from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import {
  calcularExpiracaoCodigo,
  codigoDeConviteValido,
  podeAprovarMatricula,
  turmaAceitaAluno,
} from '../escopo/escopo.regras';
import { DesempenhoRepository } from '../desempenho/desempenho.repository';
import { DetalheAlunoRepository } from '../desempenho/detalhe-aluno.repository';
import { EscopoService, type DonoDeTurma } from '../escopo/escopo.service';
import { gerarCodigoConvite, normalizarCodigoConvite } from './turma.codigo';

function naoEncontrada(): never {
  throw new NotFoundException({
    error: { code: 'TURMA_NAO_ENCONTRADA', message: 'Turma não encontrada.' },
  });
}

@Injectable()
export class TurmaService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly escopo: EscopoService,
    private readonly desempenho: DesempenhoRepository,
    private readonly detalhe: DetalheAlunoRepository,
  ) {}

  // ─── Lado de quem administra ──────────────────────────────────────────────

  /** Turmas do dono, com contagens. Arquivadas entram, marcadas como tal. */
  async listar(usuarioId: string, papel: Papel): Promise<Turma[]> {
    const dono = await this.escopo.donoDoUsuario(usuarioId, papel);
    const condicao =
      dono.instituicaoId !== undefined
        ? eq(turma.instituicaoId, dono.instituicaoId)
        : eq(turma.professorDonoId, dono.professorDonoId);

    const linhas = await this.db
      .select({
        id: turma.id,
        nome: turma.nome,
        arquivada: turma.arquivada,
        codigoConvite: turma.codigoConvite,
        codigoExpiraEm: turma.codigoExpiraEm,
        anoLetivoId: anoLetivo.id,
        anoLetivoRotulo: anoLetivo.rotulo,
      })
      .from(turma)
      .innerJoin(anoLetivo, eq(anoLetivo.id, turma.anoLetivoId))
      .where(condicao)
      .orderBy(asc(anoLetivo.rotulo), asc(turma.nome));

    if (linhas.length === 0) return [];
    const ids = linhas.map((l) => l.id);
    const [professores, ativos, pendentes] = await Promise.all([
      this.contarPor(professorTurma.turmaId, professorTurma, ids),
      this.contarMatriculas(ids, 'ativa'),
      this.contarMatriculas(ids, 'pendente'),
    ]);

    return linhas.map((l) => {
      const qtdProfessores = professores.get(l.id) ?? 0;
      return {
        id: l.id,
        nome: l.nome,
        anoLetivo: { id: l.anoLetivoId, rotulo: l.anoLetivoRotulo },
        arquivada: l.arquivada,
        codigoConvite: l.codigoConvite,
        codigoExpiraEm: l.codigoExpiraEm?.toISOString() ?? null,
        quantidadeDeProfessores: qtdProfessores,
        quantidadeDeAlunos: ativos.get(l.id) ?? 0,
        solicitacoesPendentes: pendentes.get(l.id) ?? 0,
        aceitaAluno: turmaAceitaAluno({
          quantidadeDeProfessores: qtdProfessores,
          arquivada: l.arquivada,
        }),
      };
    });
  }

  private async contarPor(
    coluna: typeof professorTurma.turmaId,
    tabela: typeof professorTurma,
    ids: string[],
  ): Promise<Map<string, number>> {
    const linhas = await this.db
      .select({ turmaId: coluna, total: count() })
      .from(tabela)
      .where(inArray(coluna, ids))
      .groupBy(coluna);
    return new Map(linhas.map((l) => [l.turmaId, Number(l.total)]));
  }

  private async contarMatriculas(
    ids: string[],
    status: 'ativa' | 'pendente',
  ): Promise<Map<string, number>> {
    const linhas = await this.db
      .select({ turmaId: matriculaTurma.turmaId, total: count() })
      .from(matriculaTurma)
      .where(and(inArray(matriculaTurma.turmaId, ids), eq(matriculaTurma.status, status)))
      .groupBy(matriculaTurma.turmaId);
    return new Map(linhas.map((l) => [l.turmaId, Number(l.total)]));
  }

  /**
   * Cria a turma no ano letivo indicado e já gera o código de convite
   * (perfis.md: "ao salvar, a turma é criada no ano letivo atual e recebe um
   * código").
   *
   * Professor independente entra como professor da própria turma na mesma
   * transação — perfis.md diz que ele já é o professor dela. A instituição não:
   * ela vincula professores depois, e até lá a turma não aceita aluno.
   */
  async criar(usuarioId: string, papel: Papel, body: CriarTurmaRequest): Promise<Turma> {
    const dono = await this.escopo.donoDoUsuario(usuarioId, papel);
    const ano = await this.anoLetivoDoDono(dono, body.anoLetivoId);
    if (ano.arquivado) {
      throw new BadRequestException({
        error: {
          code: 'ANO_LETIVO_ARQUIVADO',
          message: 'Não é possível criar turma em ano letivo arquivado.',
        },
      });
    }

    const agora = new Date();
    const criada = await this.db.transaction(async (tx) => {
      const [nova] = await tx
        .insert(turma)
        .values({
          instituicaoId: dono.instituicaoId ?? null,
          professorDonoId: dono.professorDonoId ?? null,
          anoLetivoId: body.anoLetivoId,
          nome: body.nome,
          codigoConvite: gerarCodigoConvite(),
          codigoExpiraEm: calcularExpiracaoCodigo(agora),
        })
        .returning({
          id: turma.id,
          nome: turma.nome,
          codigoConvite: turma.codigoConvite,
          codigoExpiraEm: turma.codigoExpiraEm,
        })
        .catch((err) => {
          if (temViolacaoDeUnicidade(err)) {
            throw new ConflictException({
              error: {
                code: 'TURMA_DUPLICADA',
                message: 'Já existe uma turma com este nome neste ano letivo.',
              },
            });
          }
          throw err;
        });

      if (dono.professorDonoId !== undefined) {
        await tx
          .insert(professorTurma)
          .values({ turmaId: nova!.id, professorId: dono.professorDonoId });
      }
      return nova!;
    });

    const qtdProfessores = dono.professorDonoId !== undefined ? 1 : 0;
    return {
      id: criada.id,
      nome: criada.nome,
      anoLetivo: { id: ano.id, rotulo: ano.rotulo },
      arquivada: false,
      codigoConvite: criada.codigoConvite,
      codigoExpiraEm: criada.codigoExpiraEm?.toISOString() ?? null,
      quantidadeDeProfessores: qtdProfessores,
      quantidadeDeAlunos: 0,
      solicitacoesPendentes: 0,
      aceitaAluno: turmaAceitaAluno({
        quantidadeDeProfessores: qtdProfessores,
        arquivada: false,
      }),
    };
  }

  /** Renomeia ou arquiva. Arquivar é a saída quando a turma ficaria sem professor. */
  async atualizar(
    usuarioId: string,
    papel: Papel,
    turmaId: string,
    body: AtualizarTurmaRequest,
  ): Promise<Turma> {
    const dono = await this.escopo.donoDoUsuario(usuarioId, papel);
    await this.escopo.assertTurmaDoDono(turmaId, dono);

    const alteracoes: Record<string, unknown> = {};
    if (body.nome !== undefined) alteracoes.nome = body.nome;
    if (body.arquivada !== undefined) alteracoes.arquivada = body.arquivada;

    await this.db.update(turma).set(alteracoes).where(eq(turma.id, turmaId));

    const lista = await this.listar(usuarioId, papel);
    return lista.find((t) => t.id === turmaId) ?? naoEncontrada();
  }

  /**
   * Gera um código novo. Invalida o anterior e NÃO mexe em quem já está na turma
   * (perfis.md). É também o caminho para o aluno que chega no meio do ano, depois
   * de o código original expirar.
   */
  async regenerarCodigo(usuarioId: string, papel: Papel, turmaId: string): Promise<CodigoConvite> {
    const dono = await this.escopo.donoDoUsuario(usuarioId, papel);
    await this.escopo.assertTurmaDoDono(turmaId, dono);

    const expiraEm = calcularExpiracaoCodigo(new Date());
    const [atualizada] = await this.db
      .update(turma)
      .set({ codigoConvite: gerarCodigoConvite(), codigoExpiraEm: expiraEm })
      .where(eq(turma.id, turmaId))
      .returning({ codigoConvite: turma.codigoConvite, codigoExpiraEm: turma.codigoExpiraEm });

    if (!atualizada?.codigoConvite || !atualizada.codigoExpiraEm) naoEncontrada();
    return {
      codigoConvite: atualizada.codigoConvite,
      codigoExpiraEm: atualizada.codigoExpiraEm.toISOString(),
    };
  }

  /** Professores vinculados a uma turma. */
  async listarProfessores(
    usuarioId: string,
    papel: Papel,
    turmaId: string,
  ): Promise<ProfessorDaTurma[]> {
    const dono = await this.escopo.donoDoUsuario(usuarioId, papel);
    await this.escopo.assertTurmaDoDono(turmaId, dono);

    const linhas = await this.db
      .select({ professorId: usuario.id, nome: usuario.nome, email: usuario.email })
      .from(professorTurma)
      .innerJoin(usuario, eq(usuario.id, professorTurma.professorId))
      .where(eq(professorTurma.turmaId, turmaId))
      .orderBy(asc(usuario.nome));

    return linhas;
  }

  /**
   * Vincula um professor. Para instituição, o professor tem de ser da mesma
   * instituição — sem isso, um admin poderia alcançar professor de outra
   * instituição informando o id dele.
   */
  async vincularProfessor(
    usuarioId: string,
    papel: Papel,
    turmaId: string,
    professorId: string,
  ): Promise<ProfessorDaTurma[]> {
    const dono = await this.escopo.donoDoUsuario(usuarioId, papel);
    await this.escopo.assertTurmaDoDono(turmaId, dono);

    const [professor] = await this.db
      .select({
        id: usuario.id,
        tipoPerfil: usuario.tipoPerfil,
        instituicaoId: usuario.instituicaoId,
      })
      .from(usuario)
      .where(eq(usuario.id, professorId))
      .limit(1);

    if (!professor || professor.tipoPerfil !== 'professor_institucional') {
      throw new BadRequestException({
        error: {
          code: 'PROFESSOR_INVALIDO',
          message: 'Só um professor da sua instituição pode ser vinculado a esta turma.',
        },
      });
    }
    if (dono.instituicaoId === undefined || professor.instituicaoId !== dono.instituicaoId) {
      throw new ForbiddenException({
        error: {
          code: 'FORA_DO_ESCOPO',
          message: 'Este professor não pertence à sua instituição.',
        },
      });
    }

    await this.db
      .insert(professorTurma)
      .values({ turmaId, professorId })
      .onConflictDoNothing();

    return this.listarProfessores(usuarioId, papel, turmaId);
  }

  /**
   * Desvincula. Recusa deixar a turma sem nenhum professor enquanto ela estiver
   * ativa: sem professor ninguém aprova entrada nem acompanha a turma. A saída é
   * arquivar a turma, que o fluxo de atualização permite.
   */
  async desvincularProfessor(
    usuarioId: string,
    papel: Papel,
    turmaId: string,
    professorId: string,
  ): Promise<ProfessorDaTurma[]> {
    const dono = await this.escopo.donoDoUsuario(usuarioId, papel);
    await this.escopo.assertTurmaDoDono(turmaId, dono);

    const atuais = await this.listarProfessores(usuarioId, papel, turmaId);
    const [turmaAtual] = await this.db
      .select({ arquivada: turma.arquivada })
      .from(turma)
      .where(eq(turma.id, turmaId))
      .limit(1);

    const ficariaSemProfessor = atuais.length <= 1 && atuais.some((p) => p.professorId === professorId);
    if (ficariaSemProfessor && !turmaAtual?.arquivada) {
      throw new ConflictException({
        error: {
          code: 'TURMA_FICARIA_SEM_PROFESSOR',
          message:
            'Esta turma ficaria sem professor. Vincule outro professor antes, ou arquive a turma.',
        },
      });
    }

    await this.db
      .delete(professorTurma)
      .where(and(eq(professorTurma.turmaId, turmaId), eq(professorTurma.professorId, professorId)));

    return this.listarProfessores(usuarioId, papel, turmaId);
  }

  // ─── Solicitações de entrada ──────────────────────────────────────────────

  /**
   * Pendentes de uma turma. Visível para o professor que leciona nela e para o
   * admin da instituição dona (perfis.md: ambos aprovam).
   */
  async listarSolicitacoes(
    usuarioId: string,
    papel: Papel,
    turmaId: string,
  ): Promise<SolicitacaoPendente[]> {
    await this.assertEscopoDaTurma(usuarioId, papel, turmaId);

    const linhas = await this.db
      .select({
        estudanteId: matriculaTurma.estudanteId,
        nome: usuario.nome,
        solicitadoEm: matriculaTurma.solicitadoEm,
      })
      .from(matriculaTurma)
      .innerJoin(usuario, eq(usuario.id, matriculaTurma.estudanteId))
      .where(and(eq(matriculaTurma.turmaId, turmaId), eq(matriculaTurma.status, 'pendente')))
      .orderBy(asc(matriculaTurma.solicitadoEm));

    return linhas.map((l) => ({
      estudanteId: l.estudanteId,
      nome: l.nome,
      solicitadoEm: l.solicitadoEm.toISOString(),
    }));
  }

  /**
   * Aprova. `aprovadoEm` passa a valer como início da janela de dados daquele
   * aluno: a partir deste instante, e só a partir dele, a turma vê o que ele
   * produzir.
   */
  async aprovar(
    usuarioId: string,
    papel: Papel,
    turmaId: string,
    estudanteIds: string[],
  ): Promise<DecidirSolicitacoesResponse> {
    await this.assertEscopoDaTurma(usuarioId, papel, turmaId);
    await this.assertTurmaAceitaAluno(turmaId);

    const afetados = await this.db
      .update(matriculaTurma)
      .set({ status: 'ativa', aprovadoEm: new Date(), aprovadoPor: usuarioId })
      .where(
        and(
          eq(matriculaTurma.turmaId, turmaId),
          eq(matriculaTurma.status, 'pendente'),
          inArray(matriculaTurma.estudanteId, estudanteIds),
        ),
      )
      .returning({ estudanteId: matriculaTurma.estudanteId });

    return { afetados: afetados.length };
  }

  async recusar(
    usuarioId: string,
    papel: Papel,
    turmaId: string,
    estudanteIds: string[],
  ): Promise<DecidirSolicitacoesResponse> {
    await this.assertEscopoDaTurma(usuarioId, papel, turmaId);

    const afetados = await this.db
      .update(matriculaTurma)
      .set({ status: 'recusada', aprovadoEm: null, aprovadoPor: null })
      .where(
        and(
          eq(matriculaTurma.turmaId, turmaId),
          eq(matriculaTurma.status, 'pendente'),
          inArray(matriculaTurma.estudanteId, estudanteIds),
        ),
      )
      .returning({ estudanteId: matriculaTurma.estudanteId });

    return { afetados: afetados.length };
  }

  /**
   * Remove um aluno da turma. Tira o vínculo e NÃO apaga a conta dele
   * (perfis.md): a conta é do aluno e ele segue usando a plataforma sozinho.
   * Zerar `aprovadoEm` fecha a janela: a turma deixa de ver o que ele produzir.
   */
  async removerAluno(
    usuarioId: string,
    papel: Papel,
    turmaId: string,
    estudanteId: string,
  ): Promise<DecidirSolicitacoesResponse> {
    await this.assertEscopoDaTurma(usuarioId, papel, turmaId);

    const afetados = await this.db
      .update(matriculaTurma)
      .set({ status: 'removida', aprovadoEm: null, aprovadoPor: null })
      .where(
        and(eq(matriculaTurma.turmaId, turmaId), eq(matriculaTurma.estudanteId, estudanteId)),
      )
      .returning({ estudanteId: matriculaTurma.estudanteId });

    return { afetados: afetados.length };
  }

  // ─── Alunos de uma turma (níveis 2 e 3 do painel do professor) ────────────

  /**
   * Alunos DESTA turma, com a janela de dados de cada matrícula.
   *
   * Existe porque `/class/analytics` agrega todas as turmas do professor de uma
   * vez: a lista de lá não serve para a visão de uma turma só, e exibi-la como se
   * fosse daquela turma seria mentira na tela.
   */
  async alunosDaTurma(
    usuarioId: string,
    papel: Papel,
    turmaId: string,
  ): Promise<AlunoDaTurma[]> {
    await this.assertEscopoDaTurma(usuarioId, papel, turmaId);

    const visiveis = await this.escopo.alunosVisiveis([turmaId]);
    if (visiveis.length === 0) return [];

    const [metricas, acessos] = await Promise.all([
      this.desempenho.metricasPorAluno(visiveis),
      this.desempenho.ultimoAcessoPorAluno(visiveis),
    ]);

    const porId = new Map(metricas.map((m) => [m.id, m]));
    const acessoPorId = new Map(acessos.map((a) => [a.estudanteId, a.em]));

    return visiveis
      .map((v) => {
        const m = porId.get(v.estudanteId);
        return {
          estudanteId: v.estudanteId,
          nome: m?.nome ?? null,
          visivelDesde: v.visivelDesde.toISOString(),
          xpTotal: m?.xpTotal ?? 0,
          streak: m?.streak ?? 0,
          risco: m?.risco ?? ('baixo' as const),
          motivo: m?.motivo ?? '',
          ultimoAcessoEm: acessoPorId.get(v.estudanteId)?.toISOString() ?? null,
        };
      })
      .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'));
  }

  /**
   * Nível 3: o aluno por dentro — desempenho por área, temas em que erra,
   * evolução semanal e redações com nota por competência e texto.
   *
   * `janelaDoAluno` faz as duas coisas de uma vez: confirma que este aluno está
   * no escopo do observador e devolve desde quando. Se não estiver, recusa antes
   * de qualquer consulta de dado pessoal.
   */
  async detalheDoAluno(
    usuarioId: string,
    papel: Papel,
    turmaId: string,
    estudanteId: string,
  ): Promise<DetalheDoAluno> {
    await this.assertEscopoDaTurma(usuarioId, papel, turmaId);
    const visivelDesde = await this.escopo.janelaDoAluno(estudanteId, [turmaId]);

    const [linhaTurma] = await this.db
      .select({ nome: turma.nome })
      .from(turma)
      .where(eq(turma.id, turmaId))
      .limit(1);
    if (!linhaTurma) naoEncontrada();

    const visivel = [{ estudanteId, visivelDesde }];
    const [metricas, acessos, totalTentativas, porArea, temasComErro, usoPorSemana, redacoes] =
      await Promise.all([
        this.desempenho.metricasPorAluno(visivel),
        this.desempenho.ultimoAcessoPorAluno(visivel),
        this.detalhe.totalTentativas(estudanteId, visivelDesde),
        this.detalhe.porArea(estudanteId, visivelDesde),
        this.detalhe.temasComErro(estudanteId, visivelDesde),
        this.detalhe.usoPorSemana(estudanteId, visivelDesde),
        this.detalhe.redacoes(estudanteId, visivelDesde),
      ]);

    const m = metricas[0];
    return {
      estudanteId,
      nome: m?.nome ?? null,
      turmaNome: linhaTurma.nome,
      visivelDesde: visivelDesde.toISOString(),
      xpTotal: m?.xpTotal ?? 0,
      streak: m?.streak ?? 0,
      risco: m?.risco ?? 'baixo',
      motivo: m?.motivo ?? '',
      ultimoAcessoEm: acessos[0]?.em?.toISOString() ?? null,
      totalTentativas,
      porArea,
      temasComErro,
      usoPorSemana,
      redacoes,
    };
  }

  // ─── Lado do aluno ────────────────────────────────────────────────────────

  /**
   * Prévia do convite: o que o aluno confere ANTES de confirmar. Devolve só nome
   * da turma, ano letivo e de quem é a turma. Nenhum dado de colega.
   */
  async previaConvite(codigo: string): Promise<PreviaConvite> {
    const alvo = normalizarCodigoConvite(codigo);
    const [linha] = await this.db
      .select({
        turmaId: turma.id,
        turmaNome: turma.nome,
        arquivada: turma.arquivada,
        codigoConvite: turma.codigoConvite,
        codigoExpiraEm: turma.codigoExpiraEm,
        anoLetivoRotulo: anoLetivo.rotulo,
        instituicaoNome: instituicao.nome,
        professorNome: usuario.nome,
      })
      .from(turma)
      .innerJoin(anoLetivo, eq(anoLetivo.id, turma.anoLetivoId))
      .leftJoin(instituicao, eq(instituicao.id, turma.instituicaoId))
      .leftJoin(usuario, eq(usuario.id, turma.professorDonoId))
      .where(eq(turma.codigoConvite, alvo))
      .limit(1);

    if (!linha) this.codigoInvalido();
    if (!codigoDeConviteValido(linha, new Date())) this.codigoInvalido();

    const qtdProfessores = await this.contarProfessoresDaTurma(linha.turmaId);
    if (!turmaAceitaAluno({ quantidadeDeProfessores: qtdProfessores, arquivada: linha.arquivada })) {
      throw new ConflictException({
        error: {
          code: 'TURMA_NAO_ACEITA_ALUNO',
          message: 'Esta turma ainda não está aberta para entrada. Procure quem passou o código.',
        },
      });
    }

    return {
      turmaId: linha.turmaId,
      turmaNome: linha.turmaNome,
      anoLetivoRotulo: linha.anoLetivoRotulo,
      dono: linha.instituicaoNome
        ? { tipo: 'instituicao', nome: linha.instituicaoNome }
        : { tipo: 'professor_independente', nome: linha.professorNome ?? 'Professor' },
    };
  }

  /**
   * Abre a solicitação de entrada. Nasce 'pendente': perfis.md exige aprovação
   * de um professor, e até lá o aluno não aparece nos dados da turma.
   *
   * `consentimentoEm` grava o consentimento explícito daquele aluno para AQUELA
   * turma — o contrato já recusa requisição sem consentimento.
   */
  async entrarNaTurma(estudanteId: string, codigo: string): Promise<MinhaTurma> {
    const previa = await this.previaConvite(codigo);
    const agora = new Date();

    const [existente] = await this.db
      .select({ status: matriculaTurma.status })
      .from(matriculaTurma)
      .where(
        and(
          eq(matriculaTurma.turmaId, previa.turmaId),
          eq(matriculaTurma.estudanteId, estudanteId),
        ),
      )
      .limit(1);

    if (existente?.status === 'ativa') {
      throw new ConflictException({
        error: { code: 'JA_NA_TURMA', message: 'Você já está nesta turma.' },
      });
    }
    if (existente?.status === 'pendente') {
      throw new ConflictException({
        error: {
          code: 'SOLICITACAO_PENDENTE',
          message: 'Sua entrada nesta turma já está aguardando aprovação.',
        },
      });
    }

    // Recusado ou removido pode pedir de novo: a linha é reaproveitada e a janela
    // de dados recomeça na próxima aprovação.
    await this.db
      .insert(matriculaTurma)
      .values({
        turmaId: previa.turmaId,
        estudanteId,
        status: 'pendente',
        solicitadoEm: agora,
        consentimentoEm: agora,
        aprovadoEm: null,
        aprovadoPor: null,
      })
      .onConflictDoUpdate({
        target: [matriculaTurma.turmaId, matriculaTurma.estudanteId],
        set: {
          status: 'pendente',
          solicitadoEm: agora,
          consentimentoEm: agora,
          aprovadoEm: null,
          aprovadoPor: null,
        },
      });

    return {
      turmaId: previa.turmaId,
      turmaNome: previa.turmaNome,
      anoLetivoRotulo: previa.anoLetivoRotulo,
      dono: previa.dono,
      status: 'pendente',
      solicitadoEm: agora.toISOString(),
      aprovadoEm: null,
    };
  }

  /** As turmas do aluno, ativas e pendentes, para a seção no perfil dele. */
  async minhasTurmas(estudanteId: string): Promise<MinhaTurma[]> {
    const linhas = await this.db
      .select({
        turmaId: turma.id,
        turmaNome: turma.nome,
        anoLetivoRotulo: anoLetivo.rotulo,
        instituicaoNome: instituicao.nome,
        professorNome: usuario.nome,
        status: matriculaTurma.status,
        solicitadoEm: matriculaTurma.solicitadoEm,
        aprovadoEm: matriculaTurma.aprovadoEm,
      })
      .from(matriculaTurma)
      .innerJoin(turma, eq(turma.id, matriculaTurma.turmaId))
      .innerJoin(anoLetivo, eq(anoLetivo.id, turma.anoLetivoId))
      .leftJoin(instituicao, eq(instituicao.id, turma.instituicaoId))
      .leftJoin(usuario, eq(usuario.id, turma.professorDonoId))
      .where(
        and(
          eq(matriculaTurma.estudanteId, estudanteId),
          inArray(matriculaTurma.status, ['pendente', 'ativa']),
        ),
      )
      .orderBy(asc(anoLetivo.rotulo), asc(turma.nome));

    return linhas.map((l) => ({
      turmaId: l.turmaId,
      turmaNome: l.turmaNome,
      anoLetivoRotulo: l.anoLetivoRotulo,
      dono: l.instituicaoNome
        ? ({ tipo: 'instituicao', nome: l.instituicaoNome } as const)
        : ({ tipo: 'professor_independente', nome: l.professorNome ?? 'Professor' } as const),
      status: l.status,
      solicitadoEm: l.solicitadoEm.toISOString(),
      aprovadoEm: l.aprovadoEm?.toISOString() ?? null,
    }));
  }

  // ─── Apoio ────────────────────────────────────────────────────────────────

  private codigoInvalido(): never {
    // Mesma mensagem para código inexistente e expirado, de propósito: o aluno
    // não precisa da distinção e ela ajudaria a sondar códigos de outras turmas.
    throw new NotFoundException({
      error: {
        code: 'CODIGO_INVALIDO',
        message: 'Código inválido ou expirado. Peça um código novo a quem passou este.',
      },
    });
  }

  private async contarProfessoresDaTurma(turmaId: string): Promise<number> {
    const [linha] = await this.db
      .select({ total: count() })
      .from(professorTurma)
      .where(eq(professorTurma.turmaId, turmaId));
    return Number(linha?.total ?? 0);
  }

  private async assertTurmaAceitaAluno(turmaId: string): Promise<void> {
    const [linha] = await this.db
      .select({ arquivada: turma.arquivada })
      .from(turma)
      .where(eq(turma.id, turmaId))
      .limit(1);
    if (!linha) naoEncontrada();

    const qtdProfessores = await this.contarProfessoresDaTurma(turmaId);
    if (!turmaAceitaAluno({ quantidadeDeProfessores: qtdProfessores, arquivada: linha.arquivada })) {
      throw new ConflictException({
        error: {
          code: 'TURMA_NAO_ACEITA_ALUNO',
          message: 'Vincule um professor à turma (e não a mantenha arquivada) antes de aprovar alunos.',
        },
      });
    }
  }

  /**
   * Quem pode ver e decidir sobre uma turma: o professor que leciona nela, ou o
   * admin da instituição dona. Dois caminhos diferentes, resolvidos num lugar só.
   */
  private async assertEscopoDaTurma(
    usuarioId: string,
    papel: Papel,
    turmaId: string,
  ): Promise<void> {
    if (!podeAprovarMatricula(papel)) {
      throw new ForbiddenException({
        error: { code: 'FORA_DO_ESCOPO', message: 'Seu papel não decide entrada em turma.' },
      });
    }
    if (papel === 'admin_instituicao') {
      const instituicaoId = await this.escopo.instituicaoDoUsuario(usuarioId);
      await this.escopo.assertTurmaDoDono(turmaId, { instituicaoId });
      return;
    }
    await this.escopo.assertProfessorNaTurma(usuarioId, turmaId);
  }

  private async anoLetivoDoDono(
    dono: DonoDeTurma,
    anoLetivoId: string,
  ): Promise<{ id: string; rotulo: string; arquivado: boolean }> {
    const condicaoDono =
      dono.instituicaoId !== undefined
        ? and(
            eq(anoLetivoPeriodo.instituicaoId, dono.instituicaoId),
            isNull(anoLetivoPeriodo.professorDonoId),
          )
        : and(
            eq(anoLetivoPeriodo.professorDonoId, dono.professorDonoId),
            isNull(anoLetivoPeriodo.instituicaoId),
          );

    const [linha] = await this.db
      .select({
        id: anoLetivo.id,
        rotulo: anoLetivo.rotulo,
        arquivado: anoLetivoPeriodo.arquivado,
      })
      .from(anoLetivoPeriodo)
      .innerJoin(anoLetivo, eq(anoLetivo.id, anoLetivoPeriodo.anoLetivoId))
      .where(and(eq(anoLetivoPeriodo.anoLetivoId, anoLetivoId), condicaoDono))
      .limit(1);

    if (!linha) {
      throw new NotFoundException({
        error: {
          code: 'ANO_LETIVO_NAO_ENCONTRADO',
          message: 'Ano letivo não encontrado no seu escopo. Crie o ano letivo antes da turma.',
        },
      });
    }
    return linha;
  }
}

// SQLSTATE 23505 = unique_violation.
function temViolacaoDeUnicidade(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}
