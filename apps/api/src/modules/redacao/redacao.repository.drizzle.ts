import { Inject, Injectable } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import type { Database } from '@notaa/db';
import {
  avaliacaoCompetencia,
  avaliacaoRedacao,
  redacao,
  rubricaRedacao,
  usuario,
  asc,
  eq,
} from '@notaa/db';
import type { EssayCitation, EssayEvaluation, RedacaoStatus } from '@notaa/contracts';
import {
  MOCK_DEV_USER_ID,
  MOCK_DEV_USER_EMAIL,
  MOCK_DEV_USER_NOME,
  isDevBypassEnabled,
} from '../../common/dev-user';
import type { RedacaoRepositoryPort } from './redacao.repository.memory';

// Títulos canônicos das 5 competências do ENEM (doc 05 §6). Não são persistidos
// (a tabela avaliacao_competencia guarda só número+nota+justificativa+citações),
// então são reidratados aqui por número na leitura. Texto descritivo, não valor
// calibrável — a rubrica em si (definicao jsonb) é o que carrega os critérios.
const TITULO_COMPETENCIA: Record<number, string> = {
  1: 'Domínio da escrita formal',
  2: 'Compreensão do tema',
  3: 'Seleção e organização de argumentos',
  4: 'Mecanismos linguísticos de coesão',
  5: 'Proposta de intervenção',
};

/**
 * Adaptador Drizzle real de RedacaoRepositoryPort (redacao + avaliacao_redacao +
 * avaliacao_competencia + rubrica_redacao, doc 04 §6). Substitui o double em
 * memória — agora as redações persistem no Supabase e contam no dashboard.
 */
@Injectable()
export class RedacaoRepositoryDrizzle implements RedacaoRepositoryPort {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async criarRedacao(input: {
    estudanteId: string;
    texto: string;
    temaId?: string;
    temaLivre?: string;
  }): Promise<{ redacaoId: string }> {
    await this.garantirUsuarioMockDev(input.estudanteId);

    const [row] = await this.db
      .insert(redacao)
      .values({
        estudanteId: input.estudanteId,
        texto: input.texto,
        temaId: input.temaId ?? null,
        temaLivre: input.temaLivre ?? null,
        status: 'em_correcao',
      })
      .returning({ id: redacao.id });

    return { redacaoId: row!.id };
  }

  async buscarRedacao(redacaoId: string) {
    const [row] = await this.db
      .select({
        id: redacao.id,
        estudanteId: redacao.estudanteId,
        texto: redacao.texto,
        status: redacao.status,
      })
      .from(redacao)
      .where(eq(redacao.id, redacaoId))
      .limit(1);
    return row ?? null;
  }

  async atualizarStatus(redacaoId: string, status: RedacaoStatus): Promise<void> {
    await this.db.update(redacao).set({ status }).where(eq(redacao.id, redacaoId));
  }

  async salvarAvaliacao(redacaoId: string, avaliacao: EssayEvaluation): Promise<void> {
    await this.db.transaction(async (tx: any) => {
      // 1. Garante a rubrica versionada (FK NOT NULL de avaliacao_redacao). A
      //    versão é única (uq_rubrica_redacao_versao) — upsert idempotente.
      await tx
        .insert(rubricaRedacao)
        .values({ versao: avaliacao.rubricaVersao, definicao: {}, naoCalibrado: true })
        .onConflictDoNothing();
      const [rub] = await tx
        .select({ id: rubricaRedacao.id })
        .from(rubricaRedacao)
        .where(eq(rubricaRedacao.versao, avaliacao.rubricaVersao))
        .limit(1);

      // 2. Cabeçalho da avaliação (1:1 com a redação).
      const [av] = await tx
        .insert(avaliacaoRedacao)
        .values({
          redacaoId,
          notaTotal: avaliacao.notaTotal,
          feedbackGeral: avaliacao.feedbackGeral,
          rubricaId: rub!.id,
          motorVersao: avaliacao.motorVersao,
          modeloVersao: avaliacao.modeloVersao,
        })
        .returning({ id: avaliacaoRedacao.id });

      // 3. As 5 competências (I4 — sempre as 5).
      await tx.insert(avaliacaoCompetencia).values(
        avaliacao.competencias.map((c) => ({
          avaliacaoId: av!.id,
          competencia: c.competencia,
          nota: c.nota,
          justificativa: c.justificativa,
          citacoes: c.citacoes,
        })),
      );

      // 4. Conclui a redação.
      await tx.update(redacao).set({ status: 'corrigida' }).where(eq(redacao.id, redacaoId));
    });
  }

  async buscarAvaliacao(redacaoId: string): Promise<EssayEvaluation | null> {
    const [cab] = await this.db
      .select({
        id: avaliacaoRedacao.id,
        notaTotal: avaliacaoRedacao.notaTotal,
        feedbackGeral: avaliacaoRedacao.feedbackGeral,
        motorVersao: avaliacaoRedacao.motorVersao,
        modeloVersao: avaliacaoRedacao.modeloVersao,
        criadoEm: avaliacaoRedacao.criadoEm,
        rubricaVersao: rubricaRedacao.versao,
        status: redacao.status,
      })
      .from(avaliacaoRedacao)
      .innerJoin(rubricaRedacao, eq(rubricaRedacao.id, avaliacaoRedacao.rubricaId))
      .innerJoin(redacao, eq(redacao.id, avaliacaoRedacao.redacaoId))
      .where(eq(avaliacaoRedacao.redacaoId, redacaoId))
      .limit(1);

    if (!cab) return null;

    const comps = await this.db
      .select({
        competencia: avaliacaoCompetencia.competencia,
        nota: avaliacaoCompetencia.nota,
        justificativa: avaliacaoCompetencia.justificativa,
        citacoes: avaliacaoCompetencia.citacoes,
      })
      .from(avaliacaoCompetencia)
      .where(eq(avaliacaoCompetencia.avaliacaoId, cab.id))
      .orderBy(asc(avaliacaoCompetencia.competencia));

    return {
      redacaoId,
      status: cab.status as RedacaoStatus,
      rubricaVersao: cab.rubricaVersao,
      motorVersao: cab.motorVersao,
      modeloVersao: cab.modeloVersao,
      notaTotal: cab.notaTotal,
      competencias: comps.map((c) => ({
        competencia: c.competencia,
        titulo: TITULO_COMPETENCIA[c.competencia] ?? `Competência ${c.competencia}`,
        nota: c.nota,
        justificativa: c.justificativa,
        citacoes: (c.citacoes ?? []) as EssayCitation[],
      })),
      feedbackGeral: cab.feedbackGeral as EssayEvaluation['feedbackGeral'],
      criadoEm: cab.criadoEm.toISOString(),
    };
  }

  /**
   * Em dev (bypass x-development-mode, sem trigger do Supabase Auth) garante o
   * `usuario` mock antes de qualquer escrita com FK para usuario.id. Mesmo padrão
   * do OnboardingRepositoryDrizzle — restrito ao id mock e a ambiente não-prod.
   */
  private async garantirUsuarioMockDev(estudanteId: string): Promise<void> {
    if (isDevBypassEnabled() && estudanteId === MOCK_DEV_USER_ID) {
      await this.db
        .insert(usuario)
        .values({
          id: MOCK_DEV_USER_ID,
          authUid: MOCK_DEV_USER_ID,
          nome: MOCK_DEV_USER_NOME,
          email: MOCK_DEV_USER_EMAIL,
          tipoPerfil: 'estudante',
          status: 'ativo',
        })
        .onConflictDoNothing();
    }
  }
}
