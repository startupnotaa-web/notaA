import { Injectable } from '@nestjs/common';
import type { ErroClassificacao, ErrorDetectorRepositoryPort } from '@notaa/contracts';

/** ⚠️ Adaptador EM MEMÓRIA — dev/test double (ver profiler.repository.memory.ts). */
@Injectable()
export class ErrorDetectorRepositoryMemory implements ErrorDetectorRepositoryPort {
  readonly ocorrencias: {
    estudanteId: string;
    itemId: string | null;
    classificacao: ErroClassificacao;
    evidencias: object;
    confianca: number;
  }[] = [];

  async recordOcorrencia(input: {
    estudanteId: string;
    itemId: string | null;
    classificacao: ErroClassificacao;
    evidencias: object;
    confianca: number;
  }): Promise<void> {
    this.ocorrencias.push(input);
  }
}
