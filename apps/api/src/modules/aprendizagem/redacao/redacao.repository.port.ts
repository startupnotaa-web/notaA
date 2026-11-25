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
