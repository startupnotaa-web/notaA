import { Injectable } from '@nestjs/common';
import type { OnboardingRepositoryPort, OnboardingState } from '@notaa/contracts';

/**
 * ⚠️ Adaptador EM MEMÓRIA — dev/test double, não é produção.
 *
 * O projeto Supabase real ainda não existe (pendência registrada nos passos
 * 3/5 deste roadmap) e @notaa/db ainda não está injetado na API. Esta classe
 * implementa a MESMA OnboardingRepositoryPort que um adaptador Drizzle real
 * implementaria (perfil_onboarding, doc 04 §3) — trocar por persistência real
 * é trocar o provider em onboarding.module.ts, sem tocar OnboardingService.
 *
 * Estado perdido a cada restart do processo — aceitável só porque é dev/test.
 */
@Injectable()
export class OnboardingRepositoryMemory implements OnboardingRepositoryPort {
  private readonly estados = new Map<string, OnboardingState>();

  async getState(estudanteId: string): Promise<OnboardingState> {
    return this.estados.get(estudanteId) ?? { passoAtual: 1, dados: {}, concluido: false };
  }

  async saveStep(
    estudanteId: string,
    passo: number,
    dados: Record<string, unknown>,
  ): Promise<{ passoAtual: number; proximoPasso: number | null }> {
    const atual = await this.getState(estudanteId);
    const novoEstado: OnboardingState = {
      passoAtual: Math.max(atual.passoAtual, passo),
      dados: { ...atual.dados, [`passo${passo}`]: dados },
      concluido: atual.concluido,
    };
    this.estados.set(estudanteId, novoEstado);
    return { passoAtual: passo, proximoPasso: passo < 8 ? passo + 1 : null };
  }

  async complete(estudanteId: string): Promise<void> {
    const atual = await this.getState(estudanteId);
    this.estados.set(estudanteId, { ...atual, concluido: true });
    // TODO (quando o módulo `profiler` saí­r do stub — doc 05 §3): instanciar
    // PerfilCognitivo4D inicial (baixa confiança) aqui, via ProfilerRepositoryPort.
  }
}
