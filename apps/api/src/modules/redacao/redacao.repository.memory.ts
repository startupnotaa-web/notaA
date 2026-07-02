import { randomUUID } from 'node:crypto';
import type { EssayEvaluation, RedacaoStatus } from '@notaa/contracts';

/**
 * Porta de repositório para o módulo de Redação (doc 04 §6).
 * Espelha as tabelas `redacao`, `avaliacao_redacao` e `avaliacao_competencia`.
 */
export interface RedacaoRepositoryPort {
  criarRedacao(input: {
    estudanteId: string;
    texto: string;
    temaId?: string;
    temaLivre?: string;
  }): Promise<{ redacaoId: string }>;

  buscarRedacao(redacaoId: string): Promise<{
    id: string;
    estudanteId: string;
    texto: string;
    status: RedacaoStatus;
  } | null>;

  atualizarStatus(redacaoId: string, status: RedacaoStatus): Promise<void>;

  salvarAvaliacao(redacaoId: string, avaliacao: EssayEvaluation): Promise<void>;

  buscarAvaliacao(redacaoId: string): Promise<EssayEvaluation | null>;

  contarRedacoes(estudanteId: string): Promise<number>;
  listarRedacoes(estudanteId: string): Promise<{ id: string; temaId: string | null; temaLivre: string | null; status: RedacaoStatus; enviadoEm: string }[]>;
  manterLimiteRedacao(estudanteId: string, limite: number): Promise<void>;
}

/**
 * Implementação in-memory de RedacaoRepositoryPort — usada até o projeto
 * Supabase estar provisionado. Único ponto de troca (redacao.module.ts).
 */
export class RedacaoRepositoryMemory implements RedacaoRepositoryPort {
  private redacoes = new Map<
    string,
    { id: string; estudanteId: string; texto: string; status: RedacaoStatus; temaId?: string; temaLivre?: string }
  >();
  private avaliacoes = new Map<string, EssayEvaluation>();

  async criarRedacao(input: {
    estudanteId: string;
    texto: string;
    temaId?: string;
    temaLivre?: string;
  }): Promise<{ redacaoId: string }> {
    const id = randomUUID();
    this.redacoes.set(id, {
      id,
      estudanteId: input.estudanteId,
      texto: input.texto,
      status: 'em_correcao',
      temaId: input.temaId,
      temaLivre: input.temaLivre,
    });
    return { redacaoId: id };
  }

  async buscarRedacao(redacaoId: string) {
    return this.redacoes.get(redacaoId) ?? null;
  }

  async atualizarStatus(redacaoId: string, status: RedacaoStatus): Promise<void> {
    const redacao = this.redacoes.get(redacaoId);
    if (redacao) {
      redacao.status = status;
    }
  }

  async salvarAvaliacao(redacaoId: string, avaliacao: EssayEvaluation): Promise<void> {
    this.avaliacoes.set(redacaoId, avaliacao);
    await this.atualizarStatus(redacaoId, 'corrigida');
  }

  async buscarAvaliacao(redacaoId: string): Promise<EssayEvaluation | null> {
    return this.avaliacoes.get(redacaoId) ?? null;
  }

  async contarRedacoes(estudanteId: string): Promise<number> {
    return Array.from(this.redacoes.values()).filter((r) => r.estudanteId === estudanteId).length;
  }

  async listarRedacoes(estudanteId: string): Promise<{ id: string; temaId: string | null; temaLivre: string | null; status: RedacaoStatus; enviadoEm: string }[]> {
    const filtradas = Array.from(this.redacoes.values()).filter((r) => r.estudanteId === estudanteId);
    return filtradas.map((r) => ({
      id: r.id,
      temaId: r.temaId ?? null,
      temaLivre: r.temaLivre ?? null,
      status: r.status,
      enviadoEm: new Date().toISOString(),
    }));
  }

  async manterLimiteRedacao(estudanteId: string, limite: number): Promise<void> {
    const filtradas = Array.from(this.redacoes.values()).filter((r) => r.estudanteId === estudanteId);
    if (filtradas.length >= limite) {
      const paraDeletar = filtradas.length - limite + 1;
      for (let i = 0; i < paraDeletar; i++) {
        const velha = filtradas[i];
        if (velha) {
          this.redacoes.delete(velha.id);
          this.avaliacoes.delete(velha.id);
        }
      }
    }
  }
}
