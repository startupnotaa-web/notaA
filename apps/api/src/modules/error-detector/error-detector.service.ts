import { Inject, Injectable } from '@nestjs/common';
import { errorDetector } from '@notaa/engine-error-detector';
import type { ErroClassificacao, ErrorDetectorRepositoryPort, Tentativa } from '@notaa/contracts';
import { ERROR_DETECTOR_REPOSITORY } from './error-detector.tokens';

@Injectable()
export class ErrorDetectorService {
  constructor(@Inject(ERROR_DETECTOR_REPOSITORY) private readonly repo: ErrorDetectorRepositoryPort) {}

  /**
   * Hook pós-resposta ERRADA de quiz (H5.1) — a Orquestração só chama isto
   * quando `acerto = false` (doc 09 §6); a interface ErrorDetector (doc 05 §9)
   * sempre devolve uma classificação, mas só faz sentido persistir/expor
   * quando houve erro de fato. `historicoRecente` deve excluir a tentativa
   * atual (baseline anterior a ela, ver QuizRepositoryPort.getHistoricoRecente).
   *
   * `item.competencia` não influencia a classificação (heurística é só
   * comportamental — ver contrato ErrorDetector) mas É persistida na
   * ocorrência, para análise de lacunas por tema (auditoria E9).
   */
  async classificarErro(input: {
    estudanteId: string;
    item: { itemId: string; competencia?: string | null };
    tempoMs: number;
    historicoRecente: Tentativa[];
  }): Promise<{ classificacao: ErroClassificacao; confianca: number }> {
    const { classificacao, evidencias, confianca } = errorDetector.classify({
      tempoMs: input.tempoMs,
      historicoRecente: input.historicoRecente,
    });

    await this.repo.recordOcorrencia({
      estudanteId: input.estudanteId,
      itemId: input.item.itemId,
      competencia: input.item.competencia ?? null,
      classificacao,
      evidencias,
      confianca,
    });

    return { classificacao, confianca };
  }
}
