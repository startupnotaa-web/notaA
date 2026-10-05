import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AlunoDaInstituicao,
  IndicadorDeTurma,
  InstituicaoOverview,
} from '@notaa/contracts';
import {
  Database,
  and,
  anoLetivo,
  asc,
  count,
  eq,
  inArray,
  instituicao,
  matriculaTurma,
  turma,
  usuario,
} from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { DesempenhoRepository } from '../desempenho/desempenho.repository';
import { IndicadoresService } from '../desempenho/indicadores.service';
import { EscopoService } from '../escopo/escopo.service';

function media(valores: readonly number[]): number {
  if (valores.length === 0) return 0;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

/**
 * Painel administrativo da instituição.
 *
 * Tudo aqui é leitura, e toda leitura passa pelo EscopoService: as turmas são as
 * da instituição de quem chama, os alunos são os com matrícula aprovada nelas, e
 * cada um entra com a sua janela de dados. Nenhuma consulta recebe id de turma
 * ou de aluno sem antes confirmar que ele está nesse escopo.
 */
@Injectable()
export class InstituicaoService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly escopo: EscopoService,
    private readonly desempenho: DesempenhoRepository,
    private readonly indicadores: IndicadoresService,
  ) {}

  /** Agregado da instituição mais os indicadores de cada turma ativa. */
  async overview(adminId: string): Promise<InstituicaoOverview> {
    const instituicaoId = await this.escopo.instituicaoDoUsuario(adminId);
    const nome = await this.nomeDaInstituicao(instituicaoId);

    const turmas = await this.turmasAtivas(instituicaoId);
    const turmaIds = turmas.map((t) => t.id);

    const [totalProfessores, pendentesPorTurma, alunosVisiveis] = await Promise.all([
      this.contarProfessores(instituicaoId),
      this.contarPendentesPorTurma(turmaIds),
      this.escopo.alunosVisiveis(turmaIds),
    ]);

    const indicadores = await this.indicadores.deTurmas(turmaIds);

    // Agregado da instituição: calculado sobre o conjunto TODO de alunos
    // visíveis, não somando as turmas — um aluno em duas turmas seria contado
    // duas vezes por soma, e aqui ele é uma pessoa só.
    const [metricas, areaMaisFragil] = await Promise.all([
      this.desempenho.metricasPorAluno(alunosVisiveis),
      this.desempenho.areaMaisFragil(alunosVisiveis),
    ]);

    return {
      instituicaoNome: nome,
      totalTurmas: turmas.length,
      totalProfessores,
      totalAlunos: alunosVisiveis.length,
      solicitacoesPendentes: [...pendentesPorTurma.values()].reduce((a, b) => a + b, 0),
      mediaXp: media(metricas.map((m) => m.xpTotal)),
      areaMaisFragil,
      turmas: indicadores,
    };
  }

  /**
   * Alunos da instituição, com busca e filtro por turma (perfis.md).
   *
   * O filtro por turma é validado contra o escopo: passar o id de uma turma de
   * outra instituição é recusado, não ignorado.
   */
  async alunos(
    adminId: string,
    filtro: { turmaId?: string; busca?: string } = {},
  ): Promise<AlunoDaInstituicao[]> {
    const instituicaoId = await this.escopo.instituicaoDoUsuario(adminId);

    let turmaIds: string[];
    if (filtro.turmaId) {
      await this.escopo.assertTurmaDoDono(filtro.turmaId, { instituicaoId });
      turmaIds = [filtro.turmaId];
    } else {
      turmaIds = await this.escopo.turmasDaInstituicao(instituicaoId);
    }

    const visiveis = await this.escopo.alunosVisiveis(turmaIds);
    if (visiveis.length === 0) return [];

    const [metricas, acessos, turmasPorAluno] = await Promise.all([
      this.desempenho.metricasPorAluno(visiveis),
      this.desempenho.ultimoAcessoPorAluno(visiveis),
      this.turmasPorAluno(turmaIds),
    ]);

    const porId = new Map(metricas.map((m) => [m.id, m]));
    const acessoPorId = new Map(acessos.map((a) => [a.estudanteId, a.em]));

    const lista = visiveis.map((v) => {
      const m = porId.get(v.estudanteId);
      return {
        estudanteId: v.estudanteId,
        nome: m?.nome ?? null,
        turmas: turmasPorAluno.get(v.estudanteId) ?? [],
        visivelDesde: v.visivelDesde.toISOString(),
        xpTotal: m?.xpTotal ?? 0,
        streak: m?.streak ?? 0,
        risco: m?.risco ?? ('baixo' as const),
        motivo: m?.motivo ?? '',
        ultimoAcessoEm: acessoPorId.get(v.estudanteId)?.toISOString() ?? null,
      };
    });

    const busca = filtro.busca?.trim().toLowerCase();
    const filtrada = busca
      ? lista.filter((a) => (a.nome ?? '').toLowerCase().includes(busca))
      : lista;

    return filtrada.sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'));
  }

  /** Indicadores de UMA turma, para o detalhe no painel. */
  async desempenhoDaTurma(
    usuarioId: string,
    turmaId: string,
    ehAdmin: boolean,
  ): Promise<IndicadorDeTurma> {
    if (ehAdmin) {
      const instituicaoId = await this.escopo.instituicaoDoUsuario(usuarioId);
      await this.escopo.assertTurmaDoDono(turmaId, { instituicaoId });
    } else {
      await this.escopo.assertProfessorNaTurma(usuarioId, turmaId);
    }

    const [linha] = await this.db
      .select({ id: turma.id, nome: turma.nome, anoLetivoRotulo: anoLetivo.rotulo })
      .from(turma)
      .innerJoin(anoLetivo, eq(anoLetivo.id, turma.anoLetivoId))
      .where(eq(turma.id, turmaId))
      .limit(1);

    if (!linha) {
      throw new NotFoundException({
        error: { code: 'TURMA_NAO_ENCONTRADA', message: 'Turma não encontrada.' },
      });
    }

    const [indicador] = await this.indicadores.deTurmas([linha.id]);
    return indicador!;
  }

  // ─── Apoio ────────────────────────────────────────────────────────────────

  private async nomeDaInstituicao(instituicaoId: string): Promise<string> {
    const [linha] = await this.db
      .select({ nome: instituicao.nome })
      .from(instituicao)
      .where(eq(instituicao.id, instituicaoId))
      .limit(1);

    if (!linha) {
      throw new NotFoundException({
        error: { code: 'INSTITUICAO_NAO_ENCONTRADA', message: 'Instituição não encontrada.' },
      });
    }
    return linha.nome;
  }

  private async turmasAtivas(instituicaoId: string) {
    return this.db
      .select({ id: turma.id, nome: turma.nome, anoLetivoRotulo: anoLetivo.rotulo })
      .from(turma)
      .innerJoin(anoLetivo, eq(anoLetivo.id, turma.anoLetivoId))
      .where(and(eq(turma.instituicaoId, instituicaoId), eq(turma.arquivada, false)))
      .orderBy(asc(anoLetivo.rotulo), asc(turma.nome));
  }

  private async contarProfessores(instituicaoId: string): Promise<number> {
    const [linha] = await this.db
      .select({ total: count() })
      .from(usuario)
      .where(
        and(
          eq(usuario.instituicaoId, instituicaoId),
          eq(usuario.tipoPerfil, 'professor_institucional'),
        ),
      );
    return Number(linha?.total ?? 0);
  }

  private async contarPendentesPorTurma(turmaIds: string[]): Promise<Map<string, number>> {
    if (turmaIds.length === 0) return new Map();
    const linhas = await this.db
      .select({ turmaId: matriculaTurma.turmaId, total: count() })
      .from(matriculaTurma)
      .where(
        and(inArray(matriculaTurma.turmaId, turmaIds), eq(matriculaTurma.status, 'pendente')),
      )
      .groupBy(matriculaTurma.turmaId);
    return new Map(linhas.map((l) => [l.turmaId, Number(l.total)]));
  }

  private async turmasPorAluno(
    turmaIds: string[],
  ): Promise<Map<string, { id: string; nome: string }[]>> {
    if (turmaIds.length === 0) return new Map();
    const linhas = await this.db
      .select({
        estudanteId: matriculaTurma.estudanteId,
        turmaId: turma.id,
        turmaNome: turma.nome,
      })
      .from(matriculaTurma)
      .innerJoin(turma, eq(turma.id, matriculaTurma.turmaId))
      .where(
        and(inArray(matriculaTurma.turmaId, turmaIds), eq(matriculaTurma.status, 'ativa')),
      );

    const mapa = new Map<string, { id: string; nome: string }[]>();
    for (const l of linhas) {
      const lista = mapa.get(l.estudanteId) ?? [];
      lista.push({ id: l.turmaId, nome: l.turmaNome });
      mapa.set(l.estudanteId, lista);
    }
    return mapa;
  }

}
