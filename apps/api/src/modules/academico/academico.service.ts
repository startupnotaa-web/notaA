import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  quantidadeDePeriodos,
  RegraAvaliativaSchema,
  type AtribuirDisciplinaRequest,
  type AtualizarDisciplinaRequest,
  type AtualizarPeriodoAvaliativoRequest,
  type CriarDisciplinaRequest,
  type CriarPeriodoAvaliativoRequest,
  type CriarRegraAvaliativaRequest,
  type Disciplina,
  type PeriodoAvaliativo,
  type RegraAvaliativaVersao,
  type SimularRegraRequest,
  type SimularRegraResponse,
  type TurmaDisciplina,
} from '@notaa/contracts';
import {
  Database,
  and,
  anoLetivoPeriodo,
  asc,
  count,
  desc,
  disciplina,
  eq,
  periodoAvaliativo,
  professorTurma,
  regraAvaliativa,
  regraAvaliativaAtivacao,
  registrarAuditoria,
  sql,
  turmaDisciplina,
  usuario,
} from '@notaa/db';
import { simularAluno } from '@notaa/engine-grading';
import { DB_CLIENT } from '../../db/db.tokens';
import { EscopoService } from '../escopo/escopo.service';

// SQLSTATE 23505 = unique_violation.
function temViolacaoDeUnicidade(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

function conflito(code: string, message: string): never {
  throw new ConflictException({ error: { code, message } });
}

function naoEncontrado(message: string): never {
  throw new NotFoundException({ error: { code: 'NAO_ENCONTRADO', message } });
}

type LinhaPeriodo = typeof periodoAvaliativo.$inferSelect;
function paraPeriodo(p: LinhaPeriodo): PeriodoAvaliativo {
  return {
    id: p.id,
    anoLetivoId: p.anoLetivoId,
    ordem: p.ordem,
    nome: p.nome,
    dataInicio: p.dataInicio,
    dataFim: p.dataFim,
  };
}

type LinhaDisciplina = typeof disciplina.$inferSelect;
function paraDisciplina(d: LinhaDisciplina): Disciplina {
  return {
    id: d.id,
    nome: d.nome,
    codigo: d.codigo ?? null,
    areaEnem: (d.areaEnem as Disciplina['areaEnem']) ?? null,
    arquivada: d.arquivada,
  };
}

/**
 * Configuração acadêmica da instituição: períodos, disciplinas, atribuição
 * turma–disciplina–professor e versões da regra avaliativa.
 *
 * Toda consulta e escrita filtra por `instituicao_id` vindo do BANCO (via
 * EscopoService), nunca do corpo da requisição. Id de outra instituição cai no
 * mesmo "não encontrado" de id inexistente, para não permitir sondar.
 */
@Injectable()
export class AcademicoService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly escopo: EscopoService,
  ) {}

  /** O ano letivo precisa ser da instituição (e, para escrever, não arquivado). */
  private async assertAnoDaInstituicao(
    instituicaoId: string,
    anoLetivoId: string,
    { paraEscrita }: { paraEscrita: boolean },
  ): Promise<void> {
    const [periodo] = await this.db
      .select({ arquivado: anoLetivoPeriodo.arquivado })
      .from(anoLetivoPeriodo)
      .where(
        and(
          eq(anoLetivoPeriodo.anoLetivoId, anoLetivoId),
          eq(anoLetivoPeriodo.instituicaoId, instituicaoId),
        ),
      )
      .limit(1);
    if (!periodo) naoEncontrado('Ano letivo não encontrado na sua instituição.');
    if (paraEscrita && periodo.arquivado) {
      conflito('ANO_LETIVO_ARQUIVADO', 'Este ano letivo está arquivado e não aceita mudanças.');
    }
  }

  // ─── Períodos ──────────────────────────────────────────────────────────────

  async listarPeriodos(usuarioId: string, anoLetivoId: string): Promise<PeriodoAvaliativo[]> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    await this.assertAnoDaInstituicao(instituicaoId, anoLetivoId, { paraEscrita: false });
    const linhas = await this.db
      .select()
      .from(periodoAvaliativo)
      .where(
        and(
          eq(periodoAvaliativo.instituicaoId, instituicaoId),
          eq(periodoAvaliativo.anoLetivoId, anoLetivoId),
        ),
      )
      .orderBy(asc(periodoAvaliativo.ordem));
    return linhas.map(paraPeriodo);
  }

  async criarPeriodo(
    usuarioId: string,
    body: CriarPeriodoAvaliativoRequest,
  ): Promise<PeriodoAvaliativo> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    await this.assertAnoDaInstituicao(instituicaoId, body.anoLetivoId, { paraEscrita: true });
    try {
      const [criado] = await this.db
        .insert(periodoAvaliativo)
        .values({ ...body, instituicaoId })
        .returning();
      return paraPeriodo(criado!);
    } catch (e) {
      if (temViolacaoDeUnicidade(e)) {
        conflito('PERIODO_DUPLICADO', `Já existe um período na posição ${body.ordem}.`);
      }
      throw e;
    }
  }

  private async periodoDaInstituicao(instituicaoId: string, id: string): Promise<LinhaPeriodo> {
    const [p] = await this.db
      .select()
      .from(periodoAvaliativo)
      .where(and(eq(periodoAvaliativo.id, id), eq(periodoAvaliativo.instituicaoId, instituicaoId)))
      .limit(1);
    if (!p) naoEncontrado('Período não encontrado.');
    return p;
  }

  async atualizarPeriodo(
    usuarioId: string,
    id: string,
    body: AtualizarPeriodoAvaliativoRequest,
  ): Promise<PeriodoAvaliativo> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    const atual = await this.periodoDaInstituicao(instituicaoId, id);
    await this.assertAnoDaInstituicao(instituicaoId, atual.anoLetivoId, { paraEscrita: true });
    const dataInicio = body.dataInicio ?? atual.dataInicio;
    const dataFim = body.dataFim ?? atual.dataFim;
    if (dataFim <= dataInicio) {
      throw new UnprocessableEntityException({
        error: { code: 'DATAS_INVALIDAS', message: 'O fim precisa ser depois do início.' },
      });
    }
    try {
      const [atualizado] = await this.db
        .update(periodoAvaliativo)
        .set({ ...body, instituicaoId, atualizadoEm: new Date() })
        .where(and(eq(periodoAvaliativo.id, id), eq(periodoAvaliativo.instituicaoId, instituicaoId)))
        .returning();
      return paraPeriodo(atualizado!);
    } catch (e) {
      if (temViolacaoDeUnicidade(e)) {
        conflito('PERIODO_DUPLICADO', `Já existe um período na posição ${body.ordem}.`);
      }
      throw e;
    }
  }

  async removerPeriodo(usuarioId: string, id: string): Promise<void> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    const atual = await this.periodoDaInstituicao(instituicaoId, id);
    await this.assertAnoDaInstituicao(instituicaoId, atual.anoLetivoId, { paraEscrita: true });
    await this.db
      .delete(periodoAvaliativo)
      .where(and(eq(periodoAvaliativo.id, id), eq(periodoAvaliativo.instituicaoId, instituicaoId)));
  }

  // ─── Disciplinas ───────────────────────────────────────────────────────────

  async listarDisciplinas(usuarioId: string): Promise<Disciplina[]> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    const linhas = await this.db
      .select()
      .from(disciplina)
      .where(eq(disciplina.instituicaoId, instituicaoId))
      .orderBy(asc(disciplina.arquivada), asc(disciplina.nome));
    return linhas.map(paraDisciplina);
  }

  async criarDisciplina(usuarioId: string, body: CriarDisciplinaRequest): Promise<Disciplina> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    try {
      const [criada] = await this.db
        .insert(disciplina)
        .values({
          instituicaoId,
          nome: body.nome,
          codigo: body.codigo ?? null,
          areaEnem: body.areaEnem ?? null,
        })
        .returning();
      return paraDisciplina(criada!);
    } catch (e) {
      if (temViolacaoDeUnicidade(e)) conflito('DISCIPLINA_DUPLICADA', `A disciplina ${body.nome} já existe.`);
      throw e;
    }
  }

  async atualizarDisciplina(
    usuarioId: string,
    id: string,
    body: AtualizarDisciplinaRequest,
  ): Promise<Disciplina> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    try {
      const [atualizada] = await this.db
        .update(disciplina)
        .set({ ...body, instituicaoId, atualizadoEm: new Date() })
        .where(and(eq(disciplina.id, id), eq(disciplina.instituicaoId, instituicaoId)))
        .returning();
      if (!atualizada) naoEncontrado('Disciplina não encontrada.');
      return paraDisciplina(atualizada);
    } catch (e) {
      if (temViolacaoDeUnicidade(e)) conflito('DISCIPLINA_DUPLICADA', `A disciplina ${body.nome} já existe.`);
      throw e;
    }
  }

  // ─── Turma × disciplina × professor ───────────────────────────────────────

  async listarDisciplinasDaTurma(usuarioId: string, turmaId: string): Promise<TurmaDisciplina[]> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    await this.escopo.assertTurmaDoDono(turmaId, { instituicaoId });
    const linhas = await this.db
      .select({
        disciplinaId: disciplina.id,
        disciplinaNome: disciplina.nome,
        areaEnem: disciplina.areaEnem,
        professorId: turmaDisciplina.professorId,
        professorNome: usuario.nome,
      })
      .from(turmaDisciplina)
      .innerJoin(disciplina, eq(disciplina.id, turmaDisciplina.disciplinaId))
      .leftJoin(usuario, eq(usuario.id, turmaDisciplina.professorId))
      .where(and(eq(turmaDisciplina.turmaId, turmaId), eq(turmaDisciplina.instituicaoId, instituicaoId)))
      .orderBy(asc(disciplina.nome));
    return linhas.map((l) => ({
      turmaId,
      disciplina: {
        id: l.disciplinaId,
        nome: l.disciplinaNome,
        areaEnem: (l.areaEnem as Disciplina['areaEnem']) ?? null,
      },
      professor: l.professorId ? { id: l.professorId, nome: l.professorNome ?? null } : null,
    }));
  }

  /**
   * Põe a disciplina na turma, com ou sem professor. O professor precisa já
   * lecionar na turma (`professor_turma`): a atribuição diz O QUE ele leciona
   * ali, não o coloca na turma.
   */
  async atribuirDisciplina(
    usuarioId: string,
    turmaId: string,
    disciplinaId: string,
    body: AtribuirDisciplinaRequest,
  ): Promise<TurmaDisciplina[]> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    await this.escopo.assertTurmaDoDono(turmaId, { instituicaoId });
    const [disc] = await this.db
      .select({ arquivada: disciplina.arquivada })
      .from(disciplina)
      .where(and(eq(disciplina.id, disciplinaId), eq(disciplina.instituicaoId, instituicaoId)))
      .limit(1);
    if (!disc) naoEncontrado('Disciplina não encontrada.');
    if (disc.arquivada) conflito('DISCIPLINA_ARQUIVADA', 'Desarquive a disciplina antes de atribuí-la.');

    if (body.professorId) {
      const [leciona] = await this.db
        .select({ professorId: professorTurma.professorId })
        .from(professorTurma)
        .where(and(eq(professorTurma.turmaId, turmaId), eq(professorTurma.professorId, body.professorId)))
        .limit(1);
      if (!leciona) {
        conflito('PROFESSOR_FORA_DA_TURMA', 'Vincule o professor à turma antes de atribuir a disciplina.');
      }
    }

    await this.db
      .insert(turmaDisciplina)
      .values({ turmaId, disciplinaId, instituicaoId, professorId: body.professorId })
      .onConflictDoUpdate({
        target: [turmaDisciplina.turmaId, turmaDisciplina.disciplinaId],
        set: { professorId: body.professorId, atualizadoEm: new Date() },
      });
    return this.listarDisciplinasDaTurma(usuarioId, turmaId);
  }

  async removerDisciplinaDaTurma(usuarioId: string, turmaId: string, disciplinaId: string): Promise<void> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    await this.escopo.assertTurmaDoDono(turmaId, { instituicaoId });
    await this.db
      .delete(turmaDisciplina)
      .where(
        and(
          eq(turmaDisciplina.turmaId, turmaId),
          eq(turmaDisciplina.disciplinaId, disciplinaId),
          eq(turmaDisciplina.instituicaoId, instituicaoId),
        ),
      );
  }

  // ─── Regra avaliativa ─────────────────────────────────────────────────────

  private async versoes(instituicaoId: string, anoLetivoId: string): Promise<RegraAvaliativaVersao[]> {
    const regras = await this.db
      .select({
        id: regraAvaliativa.id,
        versao: regraAvaliativa.versao,
        regra: regraAvaliativa.regra,
        criadoEm: regraAvaliativa.criadoEm,
        criadoPorId: regraAvaliativa.criadoPor,
        criadoPorNome: usuario.nome,
      })
      .from(regraAvaliativa)
      .innerJoin(usuario, eq(usuario.id, regraAvaliativa.criadoPor))
      .where(
        and(eq(regraAvaliativa.instituicaoId, instituicaoId), eq(regraAvaliativa.anoLetivoId, anoLetivoId)),
      )
      .orderBy(desc(regraAvaliativa.versao));

    const ativacoes = await this.db
      .select({ regraId: regraAvaliativaAtivacao.regraId, ativadoEm: regraAvaliativaAtivacao.ativadoEm })
      .from(regraAvaliativaAtivacao)
      .where(
        and(
          eq(regraAvaliativaAtivacao.instituicaoId, instituicaoId),
          eq(regraAvaliativaAtivacao.anoLetivoId, anoLetivoId),
        ),
      )
      .orderBy(desc(regraAvaliativaAtivacao.ativadoEm), desc(regraAvaliativaAtivacao.id));

    const vigente = ativacoes[0]?.regraId ?? null;
    return regras.map((r) => {
      const ultima = ativacoes.find((a) => a.regraId === r.id);
      return {
        id: r.id,
        anoLetivoId,
        versao: r.versao,
        // Gravada já validada; o parse aqui garante o formato da resposta.
        regra: RegraAvaliativaSchema.parse(r.regra),
        criadoEm: r.criadoEm.toISOString(),
        criadoPor: { id: r.criadoPorId, nome: r.criadoPorNome ?? null },
        ativa: r.id === vigente,
        ativadaEm: ultima ? ultima.ativadoEm.toISOString() : null,
      };
    });
  }

  async listarRegras(usuarioId: string, anoLetivoId: string): Promise<RegraAvaliativaVersao[]> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    await this.assertAnoDaInstituicao(instituicaoId, anoLetivoId, { paraEscrita: false });
    return this.versoes(instituicaoId, anoLetivoId);
  }

  /** Regra vigente. Também para o professor institucional, que precisa dela para lançar notas. */
  async regraAtiva(usuarioId: string, anoLetivoId: string): Promise<RegraAvaliativaVersao | null> {
    const instituicaoId = await this.escopo.instituicaoDoUsuario(usuarioId);
    await this.assertAnoDaInstituicao(instituicaoId, anoLetivoId, { paraEscrita: false });
    return (await this.versoes(instituicaoId, anoLetivoId)).find((v) => v.ativa) ?? null;
  }

  /**
   * Mudar a regra = gravar a versão seguinte. A anterior nunca é tocada (o
   * banco recusa UPDATE nessa tabela). A nova não entra em vigor sozinha:
   * precisa ser ativada.
   */
  async criarRegra(
    usuarioId: string,
    papel: string,
    body: CriarRegraAvaliativaRequest,
  ): Promise<RegraAvaliativaVersao> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    await this.assertAnoDaInstituicao(instituicaoId, body.anoLetivoId, { paraEscrita: true });

    // Duas gravações simultâneas podem calcular a mesma versão; a unique do
    // banco recusa uma delas, e uma segunda tentativa resolve.
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const id = await this.db.transaction(async (tx) => {
          const [{ proxima }] = (await tx
            .select({ proxima: sql<number>`coalesce(max(${regraAvaliativa.versao}), 0)::int + 1` })
            .from(regraAvaliativa)
            .where(
              and(
                eq(regraAvaliativa.instituicaoId, instituicaoId),
                eq(regraAvaliativa.anoLetivoId, body.anoLetivoId),
              ),
            )) as [{ proxima: number }];
          const [criada] = await tx
            .insert(regraAvaliativa)
            .values({
              instituicaoId,
              anoLetivoId: body.anoLetivoId,
              versao: proxima,
              regra: body.regra,
              criadoPor: usuarioId,
            })
            .returning({ id: regraAvaliativa.id });
          await registrarAuditoria(tx, {
            instituicaoId,
            atorId: usuarioId,
            papel,
            acao: 'regra.criada',
            entidade: 'regra_avaliativa',
            entidadeId: criada!.id,
            dados: { anoLetivoId: body.anoLetivoId, versao: proxima },
          });
          return criada!.id;
        });
        const versoes = await this.versoes(instituicaoId, body.anoLetivoId);
        return versoes.find((v) => v.id === id)!;
      } catch (e) {
        if (!temViolacaoDeUnicidade(e) || tentativa === 1) throw e;
      }
    }
    throw new Error('inalcançável');
  }

  /**
   * Ativa uma versão. Recusa se o ano letivo não tem cadastrados exatamente os
   * períodos que a regra pede: sem isso, a nota do 4º bimestre não teria onde
   * cair.
   */
  async ativarRegra(usuarioId: string, papel: string, regraId: string): Promise<RegraAvaliativaVersao> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    const [regra] = await this.db
      .select()
      .from(regraAvaliativa)
      .where(and(eq(regraAvaliativa.id, regraId), eq(regraAvaliativa.instituicaoId, instituicaoId)))
      .limit(1);
    if (!regra) naoEncontrado('Versão da regra não encontrada.');
    await this.assertAnoDaInstituicao(instituicaoId, regra.anoLetivoId, { paraEscrita: true });

    const conteudo = RegraAvaliativaSchema.parse(regra.regra);
    const esperado = quantidadeDePeriodos(conteudo.regime);
    const [{ total }] = (await this.db
      .select({ total: count() })
      .from(periodoAvaliativo)
      .where(
        and(
          eq(periodoAvaliativo.instituicaoId, instituicaoId),
          eq(periodoAvaliativo.anoLetivoId, regra.anoLetivoId),
        ),
      )) as [{ total: number }];
    if (total !== esperado) {
      conflito(
        'PERIODOS_NAO_CONFEREM',
        `A regra pede ${esperado} períodos e o ano letivo tem ${total} cadastrados. Ajuste os períodos antes de ativar.`,
      );
    }

    const versoes = await this.versoes(instituicaoId, regra.anoLetivoId);
    const jaAtiva = versoes.find((v) => v.id === regraId)?.ativa;
    if (!jaAtiva) {
      await this.db.transaction(async (tx) => {
        await tx.insert(regraAvaliativaAtivacao).values({
          regraId,
          instituicaoId,
          anoLetivoId: regra.anoLetivoId,
          ativadoPor: usuarioId,
        });
        await registrarAuditoria(tx, {
          instituicaoId,
          atorId: usuarioId,
          papel,
          acao: 'regra.ativada',
          entidade: 'regra_avaliativa',
          entidadeId: regraId,
          dados: { anoLetivoId: regra.anoLetivoId, versao: regra.versao },
        });
      });
    }
    return (await this.versoes(instituicaoId, regra.anoLetivoId)).find((v) => v.id === regraId)!;
  }

  /** Simulação pura: nada é lido nem gravado no banco. */
  simular(body: SimularRegraRequest): SimularRegraResponse {
    return { resultados: body.alunos.map((aluno) => simularAluno(body.regra, aluno)) };
  }
}
