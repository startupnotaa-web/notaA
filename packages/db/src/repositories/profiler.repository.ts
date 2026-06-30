import { eq } from 'drizzle-orm';
import type { PerfilCognitivoState, ProfilerRepositoryPort, Recomendacao } from '@notaa/contracts';
import type { Database } from '../client';
import { perfilCognitivo4d, perfilCognitivoEvento } from '../schema';

/** Adaptador Drizzle real de ProfilerRepositoryPort (doc 04 §3) — Fase 1 (E3). */
export class ProfilerRepositoryDb implements ProfilerRepositoryPort {
  constructor(private readonly db: Database) {}

  async getPerfil(estudanteId: string): Promise<PerfilCognitivoState | null> {
    const [row] = await this.db
      .select()
      .from(perfilCognitivo4d)
      .where(eq(perfilCognitivo4d.estudanteId, estudanteId))
      .limit(1);
    if (!row) return null;
    return {
      perfil: {
        eixoVisualVerbal: Number(row.eixoVisualVerbal),
        eixoAnaliticoHolistico: Number(row.eixoAnaliticoHolistico),
        eixoSequencialAleatorio: Number(row.eixoSequencialAleatorio),
        eixoReflexivoImpulsivo: Number(row.eixoReflexivoImpulsivo),
      },
      confianca: Number(row.confianca),
      recomendacoesAtivas: row.recomendacoesAtivas as Recomendacao[],
    };
  }

  async upsertPerfil(estudanteId: string, estado: PerfilCognitivoState): Promise<void> {
    const valores = {
      eixoVisualVerbal: estado.perfil.eixoVisualVerbal.toString(),
      eixoAnaliticoHolistico: estado.perfil.eixoAnaliticoHolistico.toString(),
      eixoSequencialAleatorio: estado.perfil.eixoSequencialAleatorio.toString(),
      eixoReflexivoImpulsivo: estado.perfil.eixoReflexivoImpulsivo.toString(),
      confianca: estado.confianca.toString(),
      recomendacoesAtivas: estado.recomendacoesAtivas,
      atualizadoEm: new Date(),
    };
    await this.db
      .insert(perfilCognitivo4d)
      .values({ estudanteId, ...valores })
      .onConflictDoUpdate({ target: perfilCognitivo4d.estudanteId, set: valores });
  }

  async appendEvento(estudanteId: string, estado: PerfilCognitivoState, motivo: string): Promise<void> {
    await this.db.insert(perfilCognitivoEvento).values({
      estudanteId,
      snapshot: { ...estado.perfil, confianca: estado.confianca },
      motivo,
    });
  }
}
