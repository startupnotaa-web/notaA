import { and, desc, eq } from 'drizzle-orm';
import type { AreaConhecimento, BancoDeItemRegistro, QuizRepositoryPort, Tentativa } from '@notaa/contracts';
import type { DbExecutor } from '../client';
import {
  bancoDeItens,
  habilidadeEstudante,
  quizIaGerado,
  sessaoAvaliativa,
  tentativaResposta,
  thetaEvento,
} from '../schema';

function toRegistro(row: typeof bancoDeItens.$inferSelect): BancoDeItemRegistro {
  return {
    itemId: row.id,
    area: row.areaConhecimento,
    competencia: row.competencia,
    paramA: Number(row.paramA),
    paramB: Number(row.paramB),
    paramC: Number(row.paramC),
    enunciado: row.enunciado,
    alternativas: row.alternativas as { id: string; texto: string }[],
    gabarito: row.gabarito,
    naoCalibrado: row.naoCalibrado,
  };
}

/** Adaptador Drizzle real de QuizRepositoryPort (doc 04 §4) — Fase 1 (E2). */
export class QuizRepositoryDb implements QuizRepositoryPort {
  // DbExecutor: aceita o client OU uma transação aberta (unidade de trabalho do
  // submitAnswer — auditoria E7).
  constructor(private readonly db: DbExecutor) {}

  async createSession(estudanteId: string, area: AreaConhecimento): Promise<{ sessaoId: string }> {
    const [row] = await this.db
      .insert(sessaoAvaliativa)
      .values({ estudanteId, tipo: 'quiz', areaConhecimento: area })
      .returning({ id: sessaoAvaliativa.id });
    return { sessaoId: row!.id };
  }

  async getSession(sessaoId: string) {
    const [row] = await this.db
      .select()
      .from(sessaoAvaliativa)
      .where(eq(sessaoAvaliativa.id, sessaoId))
      .limit(1);
    if (!row || !row.areaConhecimento) return null; // sessão não é um quiz de área única
    return {
      id: row.id,
      estudanteId: row.estudanteId,
      status: row.status,
      area: row.areaConhecimento,
    };
  }

  async getHabilidade(estudanteId: string, area: AreaConhecimento) {
    const [row] = await this.db
      .select()
      .from(habilidadeEstudante)
      .where(
        and(eq(habilidadeEstudante.estudanteId, estudanteId), eq(habilidadeEstudante.areaConhecimento, area)),
      )
      .limit(1);
    if (!row) return { theta: 0, erroPadrao: 1 };
    return { theta: Number(row.theta), erroPadrao: Number(row.erroPadrao) };
  }

  async setHabilidade(
    estudanteId: string,
    area: AreaConhecimento,
    theta: number,
    erroPadrao: number,
    tentativaId?: string,
  ) {
    await this.db
      .insert(habilidadeEstudante)
      .values({
        estudanteId,
        areaConhecimento: area,
        theta: theta.toString(),
        erroPadrao: erroPadrao.toString(),
        atualizadoEm: new Date(),
      })
      .onConflictDoUpdate({
        target: [habilidadeEstudante.estudanteId, habilidadeEstudante.areaConhecimento],
        set: { theta: theta.toString(), erroPadrao: erroPadrao.toString(), atualizadoEm: new Date() },
      });

    // Append-only — histórico de theta (doc 04 §9), ligado à tentativa quando disponível.
    await this.db.insert(thetaEvento).values({
      estudanteId,
      areaConhecimento: area,
      theta: theta.toString(),
      erroPadrao: Number.isFinite(erroPadrao) ? erroPadrao.toString() : '999',
      tentativaId: tentativaId ?? null,
    });
  }

  async getItemPool(area: AreaConhecimento): Promise<BancoDeItemRegistro[]> {
    const rows = await this.db
      .select()
      .from(bancoDeItens)
      .where(and(eq(bancoDeItens.areaConhecimento, area), eq(bancoDeItens.ativo, true)));
    return rows.map(toRegistro);
  }

  async getItem(itemId: string): Promise<BancoDeItemRegistro | null> {
    const [row] = await this.db.select().from(bancoDeItens).where(eq(bancoDeItens.id, itemId)).limit(1);
    return row ? toRegistro(row) : null;
  }

  async getExpostos(sessaoId: string): Promise<string[]> {
    const rows = await this.db
      .select({ itemId: tentativaResposta.itemId })
      .from(tentativaResposta)
      .where(eq(tentativaResposta.sessaoId, sessaoId));
    return rows.map((r) => r.itemId);
  }

  async addItem(item: BancoDeItemRegistro): Promise<void> {
    // Stub: Tabela banco_de_itens real será implementada depois se necessário no DB
  }

  async recordAnswer(input: {
    sessaoId: string;
    estudanteId: string;
    itemId: string;
    resposta: string;
    acerto: boolean;
    tempoRespostaMs: number;
    idempotencyKey: string;
    temasErro?: string[];
  }): Promise<{ duplicate: boolean; tentativaId: string | null }> {
    try {
      const [tentativa] = await this.db
        .insert(tentativaResposta)
        .values({
          estudanteId: input.estudanteId,
          itemId: input.itemId,
          sessaoId: input.sessaoId,
          resposta: input.resposta,
          acerto: input.acerto,
          tempoRespostaMs: input.tempoRespostaMs,
          idempotencyKey: input.idempotencyKey,
          temasErro: input.temasErro ?? null,
        })
        .returning({ id: tentativaResposta.id });
      return { duplicate: false, tentativaId: tentativa!.id };
    } catch (e) {
      // UNIQUE(idempotency_key) — reenvio do mesmo POST (doc 05 §1).
      if (e instanceof Error && 'code' in e && (e as { code?: string }).code === '23505') {
        return { duplicate: true, tentativaId: null };
      }
      throw e;
    }
  }

  async finishSession(sessaoId: string): Promise<void> {
    await this.db
      .update(sessaoAvaliativa)
      .set({ status: 'concluida', finalizadoEm: new Date() })
      .where(eq(sessaoAvaliativa.id, sessaoId));
  }

  async getHistoricoRecente(
    estudanteId: string,
    area: AreaConhecimento,
    limit: number,
  ): Promise<Tentativa[]> {
    const rows = await this.db
      .select({
        itemId: tentativaResposta.itemId,
        acerto: tentativaResposta.acerto,
        tempoMs: tentativaResposta.tempoRespostaMs,
        criadoEm: tentativaResposta.criadoEm,
      })
      .from(tentativaResposta)
      .innerJoin(bancoDeItens, eq(bancoDeItens.id, tentativaResposta.itemId))
      .where(and(eq(tentativaResposta.estudanteId, estudanteId), eq(bancoDeItens.areaConhecimento, area)))
      .orderBy(desc(tentativaResposta.criadoEm))
      .limit(limit);
    return rows.map((r) => ({ ...r, criadoEm: r.criadoEm.toISOString() })).reverse();
  }

  async getHistoricoPerguntasIA(
    estudanteId: string,
    area: AreaConhecimento,
    limit: number,
  ): Promise<string[]> {
    const rows = await this.db
      .select({ enunciado: quizIaGerado.enunciado })
      .from(quizIaGerado)
      .where(and(eq(quizIaGerado.estudanteId, estudanteId), eq(quizIaGerado.areaConhecimento, area)))
      .orderBy(desc(quizIaGerado.criadoEm))
      .limit(limit);
    return rows.map((r) => r.enunciado);
  }

  async registrarPerguntaIA(
    estudanteId: string,
    area: AreaConhecimento,
    tema: string,
    enunciado: string,
  ): Promise<void> {
    await this.db.insert(quizIaGerado).values({ estudanteId, areaConhecimento: area, tema, enunciado });
  }
}
