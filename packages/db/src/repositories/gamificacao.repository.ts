import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import type {
  ConquistaCatalogo,
  ConquistaConcedida,
  GamificacaoRepositoryPort,
  StreakState,
  XpLedgerEntry,
  XpOrigem,
} from '@notaa/contracts';
import type { Database } from '../client';
import { conquista, conquistaConcedida, streak, xpLedger, perfilCognitivo4d } from '../schema';

const FREEZES_INICIAIS = 1; // tolerância padrão (gamificação inclusiva, doc 08 §6) — Q-05 ainda não calibrado.

/** Adaptador Drizzle real de GamificacaoRepositoryPort (doc 04 §7) — Fase 1 (E9). */
export class GamificacaoRepositoryDb implements GamificacaoRepositoryPort {
  constructor(private readonly db: Database) {}

  async grantXp(input: {
    estudanteId: string;
    origem: XpOrigem;
    valor: number;
    referenciaId?: string;
  }): Promise<void> {
    await this.db.insert(xpLedger).values({
      estudanteId: input.estudanteId,
      origem: input.origem,
      valor: input.valor,
      referenciaId: input.referenciaId,
    });
  }

  async getXpTotal(estudanteId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${xpLedger.valor}), 0)` })
      .from(xpLedger)
      .where(eq(xpLedger.estudanteId, estudanteId));
    return Number(row?.total ?? 0);
  }

  async getXpLedger(
    estudanteId: string,
    pagination: { cursor?: string; limit: number },
  ): Promise<{ items: XpLedgerEntry[]; nextCursor: string | null }> {
    let cursorCondition;
    if (pagination.cursor) {
      const [cursorRow] = await this.db
        .select({ criadoEm: xpLedger.criadoEm })
        .from(xpLedger)
        .where(eq(xpLedger.id, pagination.cursor))
        .limit(1);
      if (cursorRow) {
        cursorCondition = or(
          lt(xpLedger.criadoEm, cursorRow.criadoEm),
          and(eq(xpLedger.criadoEm, cursorRow.criadoEm), lt(xpLedger.id, pagination.cursor)),
        );
      }
    }

    const where = cursorCondition
      ? and(eq(xpLedger.estudanteId, estudanteId), cursorCondition)
      : eq(xpLedger.estudanteId, estudanteId);

    const rows = await this.db
      .select()
      .from(xpLedger)
      .where(where)
      .orderBy(desc(xpLedger.criadoEm), desc(xpLedger.id))
      .limit(pagination.limit + 1);

    const hasMore = rows.length > pagination.limit;
    const pagina = hasMore ? rows.slice(0, pagination.limit) : rows;

    return {
      items: pagina.map((r) => ({
        id: r.id,
        origem: r.origem,
        valor: r.valor,
        criadoEm: r.criadoEm.toISOString(),
      })),
      nextCursor: hasMore ? pagina[pagina.length - 1]!.id : null,
    };
  }

  async getStreak(estudanteId: string): Promise<StreakState> {
    const [row] = await this.db.select().from(streak).where(eq(streak.estudanteId, estudanteId)).limit(1);
    if (!row) {
      return { diasConsecutivos: 0, ultimaAtividadeValida: null, freezesDisponiveis: FREEZES_INICIAIS };
    }
    return {
      diasConsecutivos: row.diasConsecutivos,
      ultimaAtividadeValida: row.ultimaAtividadeValida,
      freezesDisponiveis: row.freezesDisponiveis,
    };
  }

  async setStreak(estudanteId: string, novoEstado: StreakState): Promise<void> {
    await this.db
      .insert(streak)
      .values({
        estudanteId,
        diasConsecutivos: novoEstado.diasConsecutivos,
        ultimaAtividadeValida: novoEstado.ultimaAtividadeValida,
        freezesDisponiveis: novoEstado.freezesDisponiveis,
        atualizadoEm: new Date(),
      })
      .onConflictDoUpdate({
        target: streak.estudanteId,
        set: {
          diasConsecutivos: novoEstado.diasConsecutivos,
          ultimaAtividadeValida: novoEstado.ultimaAtividadeValida,
          freezesDisponiveis: novoEstado.freezesDisponiveis,
          atualizadoEm: new Date(),
        },
      });
  }

  async getAchievementsCatalogo(): Promise<ConquistaCatalogo[]> {
    const rows = await this.db
      .select({ codigo: conquista.codigo, xpAssociado: conquista.xpAssociado })
      .from(conquista)
      .where(eq(conquista.ativo, true));
    return rows;
  }

  async getAchievementsConcedidas(estudanteId: string): Promise<ConquistaConcedida[]> {
    const rows = await this.db
      .select({ codigo: conquista.codigo, concedidoEm: conquistaConcedida.concedidoEm })
      .from(conquistaConcedida)
      .innerJoin(conquista, eq(conquista.id, conquistaConcedida.conquistaId))
      .where(eq(conquistaConcedida.estudanteId, estudanteId));
    return rows.map((r) => ({ codigo: r.codigo, concedidoEm: r.concedidoEm.toISOString() }));
  }

  async grantAchievement(estudanteId: string, codigo: string): Promise<{ granted: boolean }> {
    const [item] = await this.db
      .select({ id: conquista.id })
      .from(conquista)
      .where(eq(conquista.codigo, codigo))
      .limit(1);
    if (!item) return { granted: false }; // código inexistente no catálogo — não falha silenciosamente em produção (logar fora daqui)

    const inserted = await this.db
      .insert(conquistaConcedida)
      .values({ estudanteId, conquistaId: item.id })
      .onConflictDoNothing()
      .returning({ estudanteId: conquistaConcedida.estudanteId });
    return { granted: inserted.length > 0 }; // false = já tinha (idempotente, doc 04 §7)
  }

  async syncCachePerfil(
    estudanteId: string,
    cache: { xpTotal: number; nivelAtual: number; ofensivaDias: number },
  ): Promise<void> {
    await this.db
      .update(perfilCognitivo4d)
      .set({
        xpTotal: cache.xpTotal,
        nivelAtual: cache.nivelAtual,
        ofensivaDias: cache.ofensivaDias,
        atualizadoEm: new Date(),
      })
      .where(eq(perfilCognitivo4d.estudanteId, estudanteId));
  }
}
