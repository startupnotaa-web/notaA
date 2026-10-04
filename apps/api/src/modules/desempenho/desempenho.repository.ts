import { Inject, Injectable } from '@nestjs/common';
import type { StudentRisk } from '@notaa/contracts';
import type { Database } from '@notaa/db';
import {
  and,
  bancoDeItens,
  eq,
  gte,
  inArray,
  or,
  sql,
  streak,
  tentativaResposta,
  usuario,
  xpLedger,
} from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import type { AlunoVisivel } from '../escopo/escopo.service';

export interface UltimoAcesso {
  estudanteId: string;
  /** Última tentativa de questão DENTRO da janela. `null` = nenhuma. */
  em: Date | null;
}

/**
 * Métricas de desempenho de um conjunto de alunos, sempre dentro da janela de
 * dados de cada um.
 *
 * Compartilhado de propósito entre o painel do professor e o da instituição: a
 * regra de privacidade mais sensível do produto não pode ter duas
 * implementações. Quem são os alunos visíveis e desde quando é decidido antes,
 * pelo EscopoService; aqui só se agrega sobre a lista já autorizada.
 *
 * O filtro é sempre um OR de pares (aluno, data), nunca um `IN` simples: cada
 * aluno tem a sua data de aprovação, e um `IN` com uma data única vazaria dado
 * anterior à aprovação de quem entrou depois.
 */
@Injectable()
export class DesempenhoRepository {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  /**
   * Métricas por aluno, com classificação de risco.
   *
   * RESSALVA CONSCIENTE: `streak.dias_consecutivos` é estado ATUAL, não
   * histórico. A tabela guarda o contador vigente, sem data por trás, então não
   * há como recortá-lo pela janela. Um aluno aprovado hoje já aparece com a
   * ofensiva que vinha acumulando antes. Recortar isso exigiria histórico diário
   * de ofensiva, que não existe no modelo.
   *
   * A classificação de risco também olha SÓ engajamento, não desempenho: dois
   * dias sem ofensiva marca risco alto mesmo para quem acerta tudo. Isso vem do
   * código original e continua valendo revisão.
   */
  async metricasPorAluno(alunos: readonly AlunoVisivel[]): Promise<StudentRisk[]> {
    if (!alunos.length) return [];

    const estudanteIds = alunos.map((a) => a.estudanteId);
    const xpNaJanela = or(
      ...alunos.map((a) =>
        and(eq(xpLedger.estudanteId, a.estudanteId), gte(xpLedger.criadoEm, a.visivelDesde)),
      ),
    );

    const dados = await this.db
      .select({
        id: usuario.id,
        nome: usuario.nome,
        streak: streak.diasConsecutivos,
        xpTotal: sql<number>`COALESCE(SUM(${xpLedger.valor}), 0)`,
      })
      .from(usuario)
      .leftJoin(streak, eq(usuario.id, streak.estudanteId))
      .leftJoin(xpLedger, and(eq(usuario.id, xpLedger.estudanteId), xpNaJanela))
      .where(inArray(usuario.id, estudanteIds))
      .groupBy(usuario.id, usuario.nome, streak.diasConsecutivos);

    return dados.map((d) => {
      const dias = d.streak || 0;
      let risco: 'alto' | 'medio' | 'baixo' = 'baixo';
      let motivo = '';
      if (dias < 2) {
        risco = 'alto';
        motivo = 'Ofensiva quase zerada (baixo engajamento)';
      } else if (dias <= 5) {
        risco = 'medio';
        motivo = 'Precisa de encorajamento para manter a ofensiva';
      } else {
        risco = 'baixo';
        motivo = 'Ótimo engajamento!';
      }
      return {
        id: d.id,
        nome: d.nome || 'Sem Nome',
        streak: dias,
        xpTotal: Number(d.xpTotal),
        risco,
        motivo,
      };
    });
  }

  /** Área de conhecimento com a menor taxa de acerto no conjunto. */
  async areaMaisFragil(
    alunos: readonly AlunoVisivel[],
  ): Promise<{ area: string; mediaAcertos: number } | null> {
    if (!alunos.length) return null;

    const stats = await this.db
      .select({
        area: bancoDeItens.areaConhecimento,
        mediaAcertos: sql<number>`AVG(CASE WHEN ${tentativaResposta.acerto} THEN 1.0 ELSE 0.0 END)`,
      })
      .from(tentativaResposta)
      .innerJoin(bancoDeItens, eq(tentativaResposta.itemId, bancoDeItens.id))
      .where(this.tentativasNaJanela(alunos))
      .groupBy(bancoDeItens.areaConhecimento);

    if (!stats.length) return null;

    let menor = stats[0]!;
    for (const stat of stats) {
      if (Number(stat.mediaAcertos) < Number(menor.mediaAcertos)) menor = stat;
    }
    return { area: menor.area, mediaAcertos: Number(menor.mediaAcertos) };
  }

  /**
   * Última atividade de cada aluno, para medir engajamento ("sem acesso há N
   * dias"). Usa tentativa de questão porque é o sinal de uso que tem data; a
   * ofensiva não serve, por ser contador sem histórico.
   */
  async ultimoAcessoPorAluno(alunos: readonly AlunoVisivel[]): Promise<UltimoAcesso[]> {
    if (!alunos.length) return [];

    const linhas = await this.db
      .select({
        estudanteId: tentativaResposta.estudanteId,
        em: sql<string | null>`max(${tentativaResposta.criadoEm})`,
      })
      .from(tentativaResposta)
      .where(this.tentativasNaJanela(alunos))
      .groupBy(tentativaResposta.estudanteId);

    const porAluno = new Map(linhas.map((l) => [l.estudanteId, l.em ? new Date(l.em) : null]));
    // Aluno sem nenhuma tentativa não aparece no agrupamento, mas precisa
    // aparecer no resultado — "nunca acessou" é a informação mais acionável que
    // existe para quem acompanha a turma.
    return alunos.map((a) => ({
      estudanteId: a.estudanteId,
      em: porAluno.get(a.estudanteId) ?? null,
    }));
  }

  private tentativasNaJanela(alunos: readonly AlunoVisivel[]) {
    return or(
      ...alunos.map((a) =>
        and(
          eq(tentativaResposta.estudanteId, a.estudanteId),
          gte(tentativaResposta.criadoEm, a.visivelDesde),
        ),
      ),
    );
  }
}
