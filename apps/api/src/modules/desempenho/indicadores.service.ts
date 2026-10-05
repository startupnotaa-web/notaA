import { Inject, Injectable } from '@nestjs/common';
import type { IndicadorDeTurma } from '@notaa/contracts';
import { Database, and, anoLetivo, asc, count, eq, inArray, matriculaTurma, turma } from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { EscopoService } from '../escopo/escopo.service';
import { DesempenhoRepository } from './desempenho.repository';

const DIAS_SEM_ACESSO = 7;

function media(valores: readonly number[]): number {
  if (valores.length === 0) return 0;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

/**
 * Indicadores de turma, compartilhados pelo painel da instituição e pelo do
 * professor. Antes isto era um método privado do serviço da instituição, e o
 * painel do professor teria que reimplementar o mesmo cálculo.
 *
 * O escopo é resolvido turma por turma de propósito: a janela de dados de um
 * aluno é diferente em cada uma. Aprovado em março na turma A e em agosto na
 * turma B, ele conta de março para A e de agosto para B — agregar as duas de uma
 * vez misturaria as janelas.
 */
@Injectable()
export class IndicadoresService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly escopo: EscopoService,
    private readonly desempenho: DesempenhoRepository,
  ) {}

  async deTurmas(turmaIds: readonly string[]): Promise<IndicadorDeTurma[]> {
    if (turmaIds.length === 0) return [];

    const [turmas, pendentes] = await Promise.all([
      this.db
        .select({ id: turma.id, nome: turma.nome, anoLetivoRotulo: anoLetivo.rotulo })
        .from(turma)
        .innerJoin(anoLetivo, eq(anoLetivo.id, turma.anoLetivoId))
        .where(inArray(turma.id, [...turmaIds]))
        .orderBy(asc(anoLetivo.rotulo), asc(turma.nome)),
      this.contarPendentes(turmaIds),
    ]);

    const corte = new Date(Date.now() - DIAS_SEM_ACESSO * 86_400_000);

    return Promise.all(
      turmas.map(async (t) => {
        const visiveis = await this.escopo.alunosVisiveis([t.id]);
        const [metricas, areaMaisFragil, acessos] = await Promise.all([
          this.desempenho.metricasPorAluno(visiveis),
          this.desempenho.areaMaisFragil(visiveis),
          this.desempenho.ultimoAcessoPorAluno(visiveis),
        ]);

        return {
          turmaId: t.id,
          nome: t.nome,
          anoLetivoRotulo: t.anoLetivoRotulo,
          alunosAtivos: visiveis.length,
          // Quem nunca teve atividade entra na conta: é o caso mais acionável.
          alunosSemAcesso7d: acessos.filter((a) => a.em === null || a.em < corte).length,
          solicitacoesPendentes: pendentes.get(t.id) ?? 0,
          mediaXp: media(metricas.map((m) => m.xpTotal)),
          areaMaisFragil,
        };
      }),
    );
  }

  private async contarPendentes(turmaIds: readonly string[]): Promise<Map<string, number>> {
    const linhas = await this.db
      .select({ turmaId: matriculaTurma.turmaId, total: count() })
      .from(matriculaTurma)
      .where(
        and(
          inArray(matriculaTurma.turmaId, [...turmaIds]),
          eq(matriculaTurma.status, 'pendente'),
        ),
      )
      .groupBy(matriculaTurma.turmaId);
    return new Map(linhas.map((l) => [l.turmaId, Number(l.total)]));
  }
}
