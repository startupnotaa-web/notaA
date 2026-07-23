import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import { Database, perfilOnboarding, tentativaResposta, trilhaEstudo, desc, eq, and } from '@notaa/db';
import { LLM_PROVIDER } from '../ai/ai.tokens';
import { GeminiStudyTrailSchema, StudyTrailResponse, type LLMProviderPort } from '@notaa/contracts';
import { PROMPT_TRILHA_TEMPLATE, montarPromptTrilha } from '@notaa/prompts';
import { z } from 'zod';
import * as Sentry from '@sentry/node';
@Injectable()
export class StudyTrailsService {
  private readonly logger = new Logger(StudyTrailsService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    @Inject(LLM_PROVIDER) private readonly llm: LLMProviderPort,
  ) {}

  async generateTrail(estudanteId: string): Promise<StudyTrailResponse> {
    // 1. Check if an active trail exists (created today, for instance). For simplicity, we just check the latest.
    const lastTrail = await this.db.select()
      .from(trilhaEstudo)
      .where(eq(trilhaEstudo.estudanteId, estudanteId))
      .orderBy(desc(trilhaEstudo.criadoEm))
      .limit(1)
      .then(res => res[0]);

    if (lastTrail) {
      // Return cached
      return {
        id: lastTrail.id,
        titulo: lastTrail.titulo,
        descricao: lastTrail.descricao,
        passos: lastTrail.passos as any,
        criadoEm: lastTrail.criadoEm.toISOString(),
      };
    }

    // 2. Fetch student context
    const profile = await this.db.select({ idade: perfilOnboarding.idade, serie: perfilOnboarding.serie })
      .from(perfilOnboarding)
      .where(eq(perfilOnboarding.estudanteId, estudanteId))
      .limit(1)
      .then(res => res[0]);

    const idade = profile?.idade || 'não informada';
    const serie = profile?.serie || 'não informada';

    // 3. Fetch recent mistakes
    const mistakes = await this.db.select({ temas: tentativaResposta.temasErro })
      .from(tentativaResposta)
      .where(and(eq(tentativaResposta.estudanteId, estudanteId), eq(tentativaResposta.acerto, false)))
      .orderBy(desc(tentativaResposta.criadoEm))
      .limit(5);

    const allThemes = mistakes.flatMap(m => Array.isArray(m.temas) ? m.temas : []);
    const uniqueThemes = [...new Set(allThemes)];
    const temasText = uniqueThemes.length > 0 ? uniqueThemes.join(', ') : 'Temas variados';

    // 4. Generate via Gemini
    const sistema = montarPromptTrilha({ idade: String(idade), serie: String(serie), temas: temasText });

    let data: z.infer<typeof GeminiStudyTrailSchema>;
    try {
      const result = await this.llm.complete({
        sistema,
        contexto: { temasErrados: uniqueThemes },
        schema: GeminiStudyTrailSchema,
        origem: 'trilha',
        usuarioId: estudanteId,
        promptVersao: PROMPT_TRILHA_TEMPLATE.versao,
      });
      data = result.data;
    } catch (e: any) {
      if (e.message?.includes('LLM_API_KEY não configurado')) {
        this.logger.warn('LLM_API_KEY ausente. Retornando trilha mockada.');
        Sentry.captureMessage('LLM_API_KEY ausente. Trilha mockada gerada.', 'warning');
        data = {
          titulo: 'Revisão Rápida (Mock)',
          descricao: 'Esta é uma trilha gerada offline pois a chave de API da IA não está configurada localmente.',
          passos: [
            { titulo: 'Passo 1', descricao: 'Revise as fórmulas principais.', dica: 'Anote-as em post-its.' },
            { titulo: 'Passo 2', descricao: 'Refaça 3 questões fáceis.', dica: 'Sem pressa.' },
            { titulo: 'Passo 3', descricao: 'Resolva 1 questão difícil.', dica: 'Aplique o método socrático.' }
          ]
        };
      } else {
        throw e;
      }
    }

    // 5. Save to DB
    const inserted = await this.db.insert(trilhaEstudo).values({
      estudanteId,
      titulo: data.titulo,
      descricao: data.descricao,
      passos: data.passos,
    }).returning().then(res => res[0]);

    if (!inserted) throw new Error('Falha ao salvar trilha no banco de dados.');

    return {
      id: inserted.id,
      titulo: inserted.titulo,
      descricao: inserted.descricao,
      passos: inserted.passos as any,
      criadoEm: inserted.criadoEm.toISOString(),
    };
  }
}
