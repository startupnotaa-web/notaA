import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  AchievementsResponse,
  GamificacaoRepositoryPort,
  StreakResponse,
  StreakState,
  XpLedgerEntry,
  XpOrigem,
} from '@notaa/contracts';
import { GAMIFICACAO_REPOSITORY } from './gamificacao.tokens';
import { nivelDeXp } from './nivel';

/** Resultado de um lançamento de XP, já com a info de nível (E9 — "subiu de nível"). */
export interface XpGrantResult {
  xpTotal: number;
  nivel: number;
  nivelAnterior: number;
  subiuDeNivel: boolean;
}

function toStreakResponse(estado: StreakState): StreakResponse {
  return {
    diasConsecutivos: estado.diasConsecutivos,
    ultimaAtividade: estado.ultimaAtividadeValida,
    freezesDisponiveis: estado.freezesDisponiveis,
  };
}

// Marcos de XP/streak que disparam conquista — catálogo real semeado em
// `conquista` (doc 09 §6 seeds). Códigos aqui DEVEM existir no catálogo;
// grantAchievement ignora silenciosamente código inexistente (defensivo).
const MARCOS_XP = [
  { limiar: 1, codigo: 'primeiro_xp' },
  { limiar: 100, codigo: 'xp_100' },
  { limiar: 500, codigo: 'xp_500' },
] as const;

const MARCOS_STREAK = [
  { dias: 3, codigo: 'streak_3_dias' },
  { dias: 7, codigo: 'streak_7_dias' },
  { dias: 15, codigo: 'streak_15_dias' },
  { dias: 30, codigo: 'streak_30_dias' },
  { dias: 60, codigo: 'streak_60_dias' },
  { dias: 120, codigo: 'streak_120_dias' },
  { dias: 240, codigo: 'streak_240_dias' },
] as const;

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function diferencaEmDias(de: string, para: string): number {
  const msPorDia = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(para) - Date.parse(de)) / msPorDia);
}

@Injectable()
export class GamificacaoService {
  constructor(@Inject(GAMIFICACAO_REPOSITORY) private readonly repo: GamificacaoRepositoryPort) {}

  /**
   * Lançamento append-only (I7) + conquistas por marco + detecção de "subiu de
   * nível" (E9). Compara o nível ANTES e DEPOIS do lançamento (incluindo bônus
   * de conquista, que também lançam XP) para o cliente comemorar a evolução.
   */
  async grantXp(
    estudanteId: string,
    origem: XpOrigem,
    valor: number,
    referenciaId?: string,
  ): Promise<XpGrantResult> {
    const xpAntes = await this.repo.getXpTotal(estudanteId);
    if (valor === 0) {
      const nivel = nivelDeXp(xpAntes);
      return { xpTotal: xpAntes, nivel, nivelAnterior: nivel, subiuDeNivel: false };
    }

    await this.repo.grantXp({ estudanteId, origem, valor, referenciaId });

    let xpTotal = await this.repo.getXpTotal(estudanteId);
    for (const marco of MARCOS_XP) {
      if (xpTotal >= marco.limiar) {
        const { granted } = await this.repo.grantAchievement(estudanteId, marco.codigo);
        if (granted) await this.concederXpDaConquista(estudanteId, marco.codigo);
      }
    }
    // Re-lê após os bônus de conquista (que também são lançamentos de XP).
    xpTotal = await this.repo.getXpTotal(estudanteId);

    const nivelAnterior = nivelDeXp(xpAntes);
    const nivel = nivelDeXp(xpTotal);
    
    // Atualiza o cache do perfil (Q-05 / Passo B)
    const streak = await this.repo.getStreak(estudanteId);
    await this.repo.syncCachePerfil(estudanteId, {
      xpTotal,
      nivelAtual: nivel,
      ofensivaDias: streak.diasConsecutivos,
    });

    return { xpTotal, nivel, nivelAnterior, subiuDeNivel: nivel > nivelAnterior };
  }

  /** Nível + XP atuais sem lançar nada (ex.: resposta de quiz idempotente/duplicada). */
  async nivelAtual(estudanteId: string): Promise<{ xpTotal: number; nivel: number }> {
    const xpTotal = await this.repo.getXpTotal(estudanteId);
    return { xpTotal, nivel: nivelDeXp(xpTotal) };
  }

  /**
   * Registra UMA atividade válida no dia de hoje (idempotente — não conta 2x
   * o mesmo dia). Regra de continuidade (doc 08 §6, gamificação inclusiva):
   *  - mesmo dia da última atividade → no-op.
   *  - dia seguinte → +1 consecutivo.
   *  - exatamente 1 dia perdido E há freeze disponível → consome 1 freeze, mantém streak.
   *  - qualquer outro gap → reinicia em 1 (nunca abaixo de 1 no dia em que há atividade).
   */
  async registrarAtividadeValida(estudanteId: string): Promise<StreakResponse> {
    const hoje = hojeISO();
    const atual = await this.repo.getStreak(estudanteId);

    if (atual.ultimaAtividadeValida === hoje) {
      return toStreakResponse(atual);
    }

    let novoEstado: typeof atual;
    if (!atual.ultimaAtividadeValida) {
      novoEstado = { diasConsecutivos: 1, ultimaAtividadeValida: hoje, freezesDisponiveis: atual.freezesDisponiveis };
    } else {
      const gap = diferencaEmDias(atual.ultimaAtividadeValida, hoje);
      if (gap === 1) {
        novoEstado = {
          diasConsecutivos: atual.diasConsecutivos + 1,
          ultimaAtividadeValida: hoje,
          freezesDisponiveis: atual.freezesDisponiveis,
        };
      } else if (gap === 2 && atual.freezesDisponiveis > 0) {
        novoEstado = {
          diasConsecutivos: atual.diasConsecutivos + 1,
          ultimaAtividadeValida: hoje,
          freezesDisponiveis: atual.freezesDisponiveis - 1,
        };
      } else {
        novoEstado = { diasConsecutivos: 1, ultimaAtividadeValida: hoje, freezesDisponiveis: atual.freezesDisponiveis };
      }
    }

    await this.repo.setStreak(estudanteId, novoEstado);

    for (const marco of MARCOS_STREAK) {
      if (novoEstado.diasConsecutivos >= marco.dias) {
        const { granted } = await this.repo.grantAchievement(estudanteId, marco.codigo);
        if (granted) await this.concederXpDaConquista(estudanteId, marco.codigo);
      }
    }
    
    // Atualiza o cache do perfil (Q-05 / Passo B)
    const xpTotal = await this.repo.getXpTotal(estudanteId);
    const nivel = nivelDeXp(xpTotal);
    await this.repo.syncCachePerfil(estudanteId, {
      xpTotal,
      nivelAtual: nivel,
      ofensivaDias: novoEstado.diasConsecutivos,
    });

    return toStreakResponse(novoEstado);
  }

  async getStreak(estudanteId: string): Promise<StreakResponse> {
    return toStreakResponse(await this.repo.getStreak(estudanteId));
  }

  /**
   * Recuperação de ofensiva via item da loja (Missão 3) — consome 1 freeze de
   * `freezesDisponiveis` para retroagir a última atividade a ontem, permitindo
   * que a atividade de hoje reconecte o streak em vez de zerá-lo. Só se aplica
   * quando exatamente 1 dia foi perdido (gap === 2) — qualquer outro caso é
   * erro real (400), nunca um no-op silencioso.
   */
  async recoverStreak(estudanteId: string): Promise<StreakResponse> {
    const hoje = hojeISO();
    const atual = await this.repo.getStreak(estudanteId);

    if (!atual.ultimaAtividadeValida) {
      throw new BadRequestException({
        error: {
          code: 'STREAK_SEM_HISTORICO',
          message: 'Você ainda não tem uma ofensiva ativa para recuperar.',
        },
      });
    }

    const gap = diferencaEmDias(atual.ultimaAtividadeValida, hoje);
    if (gap !== 2) {
      throw new BadRequestException({
        error: {
          code: 'STREAK_NAO_RECUPERAVEL',
          message: 'A recuperação só está disponível quando exatamente 1 dia de ofensiva foi perdido.',
        },
      });
    }

    if (atual.freezesDisponiveis <= 0) {
      throw new BadRequestException({
        error: {
          code: 'SEM_FREEZE_DISPONIVEL',
          message: 'Você não tem nenhum item de recuperação de ofensiva disponível na loja.',
        },
      });
    }

    const dataHoje = new Date();
    dataHoje.setDate(dataHoje.getDate() - 1);
    const ontem = dataHoje.toISOString().slice(0, 10);

    const novoEstado = {
      diasConsecutivos: atual.diasConsecutivos,
      ultimaAtividadeValida: ontem,
      freezesDisponiveis: atual.freezesDisponiveis - 1,
    };

    await this.repo.setStreak(estudanteId, novoEstado);
    return toStreakResponse(novoEstado);
  }

  async getXpTotal(estudanteId: string): Promise<number> {
    return this.repo.getXpTotal(estudanteId);
  }

  async getXpLedger(
    estudanteId: string,
    pagination: { cursor?: string; limit: number },
  ): Promise<{ items: XpLedgerEntry[]; nextCursor: string | null }> {
    return this.repo.getXpLedger(estudanteId, pagination);
  }

  async getAchievements(estudanteId: string): Promise<AchievementsResponse> {
    const [catalogo, concedidas] = await Promise.all([
      this.repo.getAchievementsCatalogo(),
      this.repo.getAchievementsConcedidas(estudanteId),
    ]);
    const concedidasPorCodigo = new Map(concedidas.map((c) => [c.codigo, c.concedidoEm]));

    const desbloqueadas = catalogo
      .filter((c) => concedidasPorCodigo.has(c.codigo))
      .map((c) => ({ codigo: c.codigo, xpAssociado: c.xpAssociado, concedidoEm: concedidasPorCodigo.get(c.codigo)! }));
    const bloqueadas = catalogo
      .filter((c) => !concedidasPorCodigo.has(c.codigo))
      .map((c) => ({ codigo: c.codigo, xpAssociado: c.xpAssociado, concedidoEm: null }));

    return { desbloqueadas, bloqueadas };
  }

  /** XP da própria conquista (origem='conquista') — separado do XP que a originou. */
  private async concederXpDaConquista(estudanteId: string, codigo: string): Promise<void> {
    const catalogo = await this.repo.getAchievementsCatalogo();
    const conquista = catalogo.find((c) => c.codigo === codigo);
    if (conquista && conquista.xpAssociado > 0) {
      await this.repo.grantXp({ estudanteId, origem: 'conquista', valor: conquista.xpAssociado });
    }
  }
}
