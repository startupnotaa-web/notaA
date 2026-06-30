import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  ConquistaCatalogo,
  ConquistaConcedida,
  GamificacaoRepositoryPort,
  StreakState,
  XpLedgerEntry,
  XpOrigem,
} from '@notaa/contracts';

interface LancamentoMemoria extends XpLedgerEntry {
  estudanteId: string;
}

/**
 * ⚠️ Adaptador EM MEMÓRIA — dev/test double (mesmo padrão de
 * quiz.repository.memory.ts e onboarding.repository.memory.ts). Usado pelos
 * testes e2e para isolar a lógica de GamificacaoService da infra real
 * (@notaa/db) — trocar por GamificacaoRepositoryDb é o único ponto de mudança
 * em produção (gamificacao.module.ts).
 */
@Injectable()
export class GamificacaoRepositoryMemory implements GamificacaoRepositoryPort {
  private readonly ledger: LancamentoMemoria[] = [];
  private readonly streaks = new Map<string, StreakState>();
  private readonly catalogo: ConquistaCatalogo[] = [
    { codigo: 'primeiro_xp', xpAssociado: 5 },
    { codigo: 'xp_100', xpAssociado: 20 },
    { codigo: 'xp_500', xpAssociado: 50 },
    { codigo: 'streak_3_dias', xpAssociado: 15 },
    { codigo: 'streak_7_dias', xpAssociado: 30 },
  ];
  private readonly concedidas = new Map<string, Set<string>>();

  async grantXp(input: { estudanteId: string; origem: XpOrigem; valor: number; referenciaId?: string }) {
    this.ledger.push({
      id: randomUUID(),
      estudanteId: input.estudanteId,
      origem: input.origem,
      valor: input.valor,
      criadoEm: new Date().toISOString(),
    });
  }

  async getXpTotal(estudanteId: string): Promise<number> {
    return this.ledger.filter((l) => l.estudanteId === estudanteId).reduce((acc, l) => acc + l.valor, 0);
  }

  async getXpLedger(estudanteId: string, pagination: { cursor?: string; limit: number }) {
    const itens = this.ledger
      .filter((l) => l.estudanteId === estudanteId)
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    const inicio = pagination.cursor ? itens.findIndex((i) => i.id === pagination.cursor) + 1 : 0;
    const pagina = itens.slice(inicio, inicio + pagination.limit);
    const nextCursor = inicio + pagination.limit < itens.length ? pagina[pagina.length - 1]?.id ?? null : null;
    return { items: pagina.map(({ estudanteId: _e, ...rest }) => rest), nextCursor };
  }

  async getStreak(estudanteId: string): Promise<StreakState> {
    return this.streaks.get(estudanteId) ?? { diasConsecutivos: 0, ultimaAtividadeValida: null, freezesDisponiveis: 1 };
  }

  async setStreak(estudanteId: string, novoEstado: StreakState): Promise<void> {
    this.streaks.set(estudanteId, novoEstado);
  }

  async getAchievementsCatalogo(): Promise<ConquistaCatalogo[]> {
    return this.catalogo;
  }

  async getAchievementsConcedidas(estudanteId: string): Promise<ConquistaConcedida[]> {
    const codigos = this.concedidas.get(estudanteId) ?? new Set();
    return [...codigos].map((codigo) => ({ codigo, concedidoEm: new Date().toISOString() }));
  }

  async grantAchievement(estudanteId: string, codigo: string): Promise<{ granted: boolean }> {
    if (!this.catalogo.some((c) => c.codigo === codigo)) return { granted: false };
    const codigos = this.concedidas.get(estudanteId) ?? new Set<string>();
    if (codigos.has(codigo)) return { granted: false };
    codigos.add(codigo);
    this.concedidas.set(estudanteId, codigos);
    return { granted: true };
  }

  async syncCachePerfil(
    _estudanteId: string,
    _cache: { xpTotal: number; nivelAtual: number; ofensivaDias: number },
  ): Promise<void> {
    // Repositório em memória para gamificação não possui mock da tabela perfilCognitivo4d.
    // Apenas simula a operação com sucesso.
  }
}
