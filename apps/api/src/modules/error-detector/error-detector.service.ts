import { Inject, Injectable } from '@nestjs/common';
import { errorDetector } from '@notaa/engine-error-detector';
import type { ErroClassificacao, ErrorDetectorRepositoryPort, ItemParams, Tentativa } from '@notaa/contracts';
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
   */
  async classificarErro(input: {
    estudanteId: string;
    item: ItemParams;
    tempoMs: number;
    historicoRecente: Tentativa[];
  }): Promise<{ classificacao: ErroClassificacao; confianca: number }> {
    const { classificacao, evidencias, confianca } = errorDetector.classify({
      tempoMs: input.tempoMs,
      historicoRecente: input.historicoRecente,
      item: input.item,
      acerto: false,
    });

    await this.repo.recordOcorrencia({
      estudanteId: input.estudanteId,
      itemId: input.item.itemId,
      classificacao,
      evidencias,
      confianca,
    });

    return { classificacao, confianca };
  }
}
