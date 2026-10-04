import { Inject, Injectable } from '@nestjs/common';
import type {
  DesempenhoPorArea,
  RedacaoDoAluno,
  SemanaDeUso,
  TemaComErro,
} from '@notaa/contracts';
import {
  Database,
  and,
  asc,
  avaliacaoCompetencia,
  avaliacaoRedacao,
  bancoDeItens,
  count,
  desc,
  eq,
  gte,
  redacao,
  sql,
  temaRedacao,
  tentativaResposta,
} from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';

/**
 * Consultas da visão individual do aluno (nível 3 do painel do professor).
 *
 * TODAS recebem `visivelDesde` e filtram por ele. É a mesma regra do resto do
 * sistema: instituição e professor só veem o que o aluno gerou depois da
 * aprovação. Aqui o filtro é um `gte` simples porque é um aluno só, com uma
 * janela só — diferente das agregações de turma, que precisam de um par
 * (aluno, data) por aluno.
 *
 * Quem decide se este observador pode ver ESTE aluno é o EscopoService, antes.
 * Este arquivo assume a autorização já resolvida.
 */
@Injectable()
export class DetalheAlunoRepository {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async totalTentativas(estudanteId: string, visivelDesde: Date): Promise<number> {
    const [linha] = await this.db
      .select({ total: count() })
      .from(tentativaResposta)
      .where(this.naJanela(estudanteId, visivelDesde));
    return Number(linha?.total ?? 0);
  }

  /** Acertos e tentativas por área de conhecimento. */
  async porArea(estudanteId: string, visivelDesde: Date): Promise<DesempenhoPorArea[]> {
    const linhas = await this.db
      .select({
        area: bancoDeItens.areaConhecimento,
        tentativas: count(),
        acertos: sql<number>`SUM(CASE WHEN ${tentativaResposta.acerto} THEN 1 ELSE 0 END)`,
      })
      .from(tentativaResposta)
      .innerJoin(bancoDeItens, eq(bancoDeItens.id, tentativaResposta.itemId))
      .where(this.naJanela(estudanteId, visivelDesde))
      .groupBy(bancoDeItens.areaConhecimento)
      .orderBy(asc(bancoDeItens.areaConhecimento));

    return linhas.map((l) => {
      const tentativas = Number(l.tentativas);
      const acertos = Number(l.acertos);
      return {
        area: l.area,
        tentativas,
        acertos,
        taxaAcerto: tentativas === 0 ? 0 : acertos / tentativas,
      };
    });
  }

  /**
   * Temas em que o aluno errou, do mais frequente para o menos.
   *
   * `temas_erro` é um array JSON gravado pelo detector de padrão de erro, então a
   * contagem usa `jsonb_array_elements_text` para abrir o array em linhas. Só
   * tentativas ERRADAS entram: o objetivo é mostrar onde intervir, não listar
   * tudo que o aluno já tocou.
   */
  async temasComErro(estudanteId: string, visivelDesde: Date): Promise<TemaComErro[]> {
    const linhas = await this.db
      .select({
        tema: sql<string>`tema.valor`,
        erros: sql<number>`count(*)`,
      })
      .from(tentativaResposta)
      .innerJoin(
        sql`jsonb_array_elements_text(${tentativaResposta.temasErro}) as tema(valor)`,
        sql`true`,
      )
      .where(
        and(
          this.naJanela(estudanteId, visivelDesde),
          eq(tentativaResposta.acerto, false),
          sql`${tentativaResposta.temasErro} is not null`,
        ),
      )
      .groupBy(sql`tema.valor`)
      .orderBy(sql`count(*) desc`)
      .limit(12);

    return linhas.map((l) => ({ tema: l.tema, erros: Number(l.erros) }));
  }

  /** Uso semana a semana, para enxergar a evolução no tempo. */
  async usoPorSemana(estudanteId: string, visivelDesde: Date): Promise<SemanaDeUso[]> {
    const linhas = await this.db
      .select({
        semana: sql<string>`to_char(date_trunc('week', ${tentativaResposta.criadoEm}), 'YYYY-MM-DD')`,
        tentativas: count(),
        acertos: sql<number>`SUM(CASE WHEN ${tentativaResposta.acerto} THEN 1 ELSE 0 END)`,
      })
      .from(tentativaResposta)
      .where(this.naJanela(estudanteId, visivelDesde))
      .groupBy(sql`date_trunc('week', ${tentativaResposta.criadoEm})`)
      .orderBy(sql`date_trunc('week', ${tentativaResposta.criadoEm}) asc`);

    return linhas.map((l) => ({
      semana: l.semana,
      tentativas: Number(l.tentativas),
      acertos: Number(l.acertos),
    }));
  }

  /**
   * Redações com nota por competência e o texto.
   *
   * O texto integral entra por decisão explícita do usuário, e só aqui: na visão
   * individual, dentro do bloco de redações. Redação ainda em correção aparece
   * com nota nula, porque o professor saber que o aluno escreveu é informação
   * útil mesmo antes da correção sair.
   */
  async redacoes(estudanteId: string, visivelDesde: Date): Promise<RedacaoDoAluno[]> {
    const linhas = await this.db
      .select({
        redacaoId: redacao.id,
        temaTitulo: temaRedacao.titulo,
        temaLivre: redacao.temaLivre,
        texto: redacao.texto,
        enviadoEm: redacao.enviadoEm,
        avaliacaoId: avaliacaoRedacao.id,
        notaTotal: avaliacaoRedacao.notaTotal,
      })
      .from(redacao)
      .leftJoin(temaRedacao, eq(temaRedacao.id, redacao.temaId))
      .leftJoin(avaliacaoRedacao, eq(avaliacaoRedacao.redacaoId, redacao.id))
      .where(and(eq(redacao.estudanteId, estudanteId), gte(redacao.enviadoEm, visivelDesde)))
      .orderBy(desc(redacao.enviadoEm))
      .limit(20);

    if (linhas.length === 0) return [];

    const avaliacaoIds = linhas
      .map((l) => l.avaliacaoId)
      .filter((id): id is string => id !== null);

    const competencias = avaliacaoIds.length
      ? await this.db
          .select({
            avaliacaoId: avaliacaoCompetencia.avaliacaoId,
            competencia: avaliacaoCompetencia.competencia,
            nota: avaliacaoCompetencia.nota,
            justificativa: avaliacaoCompetencia.justificativa,
          })
          .from(avaliacaoCompetencia)
          .where(sql`${avaliacaoCompetencia.avaliacaoId} in ${avaliacaoIds}`)
          .orderBy(asc(avaliacaoCompetencia.competencia))
      : [];

    return linhas.map((l) => ({
      redacaoId: l.redacaoId,
      tema: l.temaTitulo ?? l.temaLivre ?? 'Tema livre',
      enviadoEm: l.enviadoEm.toISOString(),
      notaTotal: l.notaTotal ?? null,
      competencias: competencias
        .filter((c) => c.avaliacaoId === l.avaliacaoId)
        .map((c) => ({
          competencia: c.competencia,
          nota: c.nota,
          justificativa: c.justificativa,
        })),
      texto: l.texto,
    }));
  }

  private naJanela(estudanteId: string, visivelDesde: Date) {
    return and(
      eq(tentativaResposta.estudanteId, estudanteId),
      gte(tentativaResposta.criadoEm, visivelDesde),
    );
  }
}
