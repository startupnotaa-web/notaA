import { Injectable, Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Database, batalhaPvp, usuario, eq, and, sql } from '@notaa/db';
import { not } from 'drizzle-orm';
import { DB_CLIENT } from '../../db/db.tokens';
import { LLM_PROVIDER } from '../ai/ai.tokens';
import type { LLMProviderPort, MatchmakeResponse } from '@notaa/contracts';

@Injectable()
export class BattleService {
  private readonly logger = new Logger('BattleService');

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    @Inject(LLM_PROVIDER) private readonly llm: LLMProviderPort,
  ) {}

  async matchmake(estudanteId: string, area: string): Promise<MatchmakeResponse> {
    // Busca fantasma de outro usuário
    const fantasmas = await this.db.select({
      id: batalhaPvp.id,
      questoes: batalhaPvp.questoes,
      tempoRespostas: batalhaPvp.tempoRespostas,
      usuario: {
        nome: usuario.nome,
      }
    })
    .from(batalhaPvp)
    .innerJoin(usuario, eq(usuario.id, batalhaPvp.usuarioId))
    .where(
      and(
        eq(batalhaPvp.area, area as any),
        not(eq(batalhaPvp.usuarioId, estudanteId))
      )
    )
    .orderBy(sql`RANDOM()`)
    .limit(1);

    if (fantasmas.length > 0 && fantasmas[0]) {
      const ghost = fantasmas[0];
      return {
        batalhaId: ghost.id,
        questoes: ghost.questoes as any,
        oponente: {
          nome: ghost.usuario.nome || 'Desafiante',
          avatarUrl: null,
          level: 10,
          isBot: false,
        },
        tempoRespostas: ghost.tempoRespostas as any,
      };
    }

    // Se não achou, gera via Gemini (LLM)
    this.logger.log(`Nenhum fantasma encontrado para ${area}. Gerando bot IA...`);
    const schema = z.object({
      questoes: z.array(z.object({
        enunciado: z.string(),
        alternativas: z.array(z.string()).length(4),
        correta: z.number().min(0).max(3),
      })).length(5)
    });

    let questoesGeradas = [];
    try {
      const { data } = await this.llm.complete({
        sistema: 'Você é um gerador de questões estilo ENEM para uma Batalha PvP.',
        prompt: `Gere exatamente 5 questões rápidas sobre a área de conhecimento: ${area}.`,
        contexto: {},
        schema
      });
      questoesGeradas = data.questoes;
    } catch (e) {
      this.logger.error('Falha ao gerar questões com IA', e);
      // Fallback estático caso a IA falhe (para não quebrar a exp do usuário)
      questoesGeradas = Array(5).fill(null).map((_, i) => ({
        enunciado: `Questão fallback de ${area} #${i+1}`,
        alternativas: ['A', 'B', 'C', 'D'],
        correta: 0,
      }));
    }

    const questoesFormatadas = questoesGeradas.map((q, i) => ({
      id: `bot-q-${i}`,
      enunciado: q.enunciado,
      alternativas: q.alternativas.map((alt, j) => ({
        id: String.fromCharCode(97 + j), // a, b, c, d
        texto: alt,
      })),
      corretaId: String.fromCharCode(97 + q.correta),
    }));

    const tempoRespostas = questoesFormatadas.map(q => ({
      questaoId: q.id,
      tempoSegundos: Math.floor(Math.random() * 15) + 5, // 5 a 20s
      acertou: Math.random() > 0.4, // 60% chance de acerto do bot
    }));

    return {
      questoes: questoesFormatadas,
      oponente: {
        nome: 'Fantasma IA',
        avatarUrl: null,
        level: 99,
        isBot: true,
      },
      tempoRespostas,
    };
  }

  async finishBattle(estudanteId: string, data: any) {
    const inserted = await this.db.insert(batalhaPvp).values({
      usuarioId: estudanteId,
      area: data.area,
      questoes: data.questoes,
      tempoRespostas: data.tempoRespostas,
      scoreFinal: data.scoreFinal,
    }).returning({ id: batalhaPvp.id });

    return { sucesso: true, id: inserted[0]!.id };
  }
}
