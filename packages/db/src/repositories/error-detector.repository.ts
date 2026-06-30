import type { ErrorDetectorRepositoryPort } from '@notaa/contracts';
import type { Database } from '../client';
import { ocorrenciaErro } from '../schema';

/** Adaptador Drizzle real de ErrorDetectorRepositoryPort (doc 04 §5) — Fase 2 (E5). */
export class ErrorDetectorRepositoryDb implements ErrorDetectorRepositoryPort {
  constructor(private readonly db: Database) {}

  async recordOcorrencia(input: {
    estudanteId: string;
    itemId: string | null;
    classificacao: 'lacuna_conhecimento' | 'deslize_atencao';
    evidencias: object;
    confianca: number;
  }): Promise<void> {
    await this.db.insert(ocorrenciaErro).values({
      estudanteId: input.estudanteId,
      itemId: input.itemId,
      classificacao: input.classificacao,
      evidencias: input.evidencias,
      confianca: input.confianca.toString(),
    });
  }
}
