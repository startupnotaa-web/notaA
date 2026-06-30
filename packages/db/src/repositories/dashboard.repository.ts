import { asc, eq, sql } from 'drizzle-orm';
import type {
  AreaConhecimento,
  DashboardRepositoryPort,
  DashboardResumoPerfil,
  ThetaResumoArea,
} from '@notaa/contracts';
import type { Database } from '../client';
import {
  conversaSocratica,
  perfilCognitivo4d,
  perfilOnboarding,
  redacao,
  thetaEvento,
  usuario,
} from '../schema';

const SERIE_LIMITE = 30; // últimos N pontos por área — suficiente para um gráfico de evolução (doc 05 §5).

/** Adaptador Drizzle real de DashboardRepositoryPort (doc 04 §9) — Fase 1 (E4). */
export class DashboardRepositoryDb implements DashboardRepositoryPort {
  constructor(private readonly db: Database) {}

  /**
   * Uma ÚNICA consulta: junta usuario + perfil_onboarding + perfil_cognitivo_4d
   * (LEFT JOIN — perfil 4D pode não existir ainda) e traz os contadores de
   * progresso como subqueries correlacionadas, evitando N idas ao banco.
   */
  async getResumoPerfil(estudanteId: string): Promise<DashboardResumoPerfil> {
    const [row] = await this.db
      .select({
        nome: usuario.nome,
        objetivoEnem: perfilOnboarding.objetivoEnem,
        concluidoEm: perfilOnboarding.concluidoEm,
        vv: perfilCognitivo4d.eixoVisualVerbal,
        ah: perfilCognitivo4d.eixoAnaliticoHolistico,
        sa: perfilCognitivo4d.eixoSequencialAleatorio,
        ri: perfilCognitivo4d.eixoReflexivoImpulsivo,
        conf: perfilCognitivo4d.confianca,
        redacoesEnviadas: sql<number>`(select count(*)::int from ${redacao} where ${redacao.estudanteId} = ${usuario.id})`,
        sessoesSocraticas: sql<number>`(select count(*)::int from ${conversaSocratica} where ${conversaSocratica.estudanteId} = ${usuario.id})`,
      })
      .from(usuario)
      .leftJoin(perfilOnboarding, eq(perfilOnboarding.estudanteId, usuario.id))
      .leftJoin(perfilCognitivo4d, eq(perfilCognitivo4d.estudanteId, usuario.id))
      .where(eq(usuario.id, estudanteId))
      .limit(1);

    if (!row) {
      return {
        nome: null,
        objetivoEnem: null,
        onboardingConcluido: false,
        perfil4d: null,
        redacoesEnviadas: 0,
        sessoesSocraticas: 0,
      };
    }

    // numeric do Postgres volta como string; converte e detecta ausência do 4D
    // pelo LEFT JOIN (colunas null quando não há linha).
    const perfil4d =
      row.vv !== null
        ? {
            visualVerbal: Number(row.vv),
            analiticoHolistico: Number(row.ah),
            sequencialAleatorio: Number(row.sa),
            reflexivoImpulsivo: Number(row.ri),
            confianca: Number(row.conf),
          }
        : null;

    return {
      nome: row.nome ?? null,
      objetivoEnem: row.objetivoEnem ?? null,
      onboardingConcluido: row.concluidoEm !== null,
      perfil4d,
      redacoesEnviadas: Number(row.redacoesEnviadas ?? 0),
      sessoesSocraticas: Number(row.sessoesSocraticas ?? 0),
    };
  }

  async getThetaResumo(
    estudanteId: string,
  ): Promise<Partial<Record<AreaConhecimento, ThetaResumoArea>>> {
    const rows = await this.db
      .select()
      .from(thetaEvento)
      .where(eq(thetaEvento.estudanteId, estudanteId))
      .orderBy(asc(thetaEvento.criadoEm));

    const resumo: Partial<Record<AreaConhecimento, ThetaResumoArea>> = {};
    for (const row of rows) {
      const area = row.areaConhecimento;
      if (!resumo[area]) resumo[area] = { atual: 0, serie: [] };
      const ponto = { t: row.criadoEm.toISOString(), v: Number(row.theta) };
      resumo[area]!.serie.push(ponto);
      resumo[area]!.atual = ponto.v; // última (ordenado asc) vence
    }

    for (const area of Object.keys(resumo) as AreaConhecimento[]) {
      const serie = resumo[area]!.serie;
      if (serie.length > SERIE_LIMITE) resumo[area]!.serie = serie.slice(-SERIE_LIMITE);
    }
    return resumo;
  }
}
