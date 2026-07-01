import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import { Database, perfilOnboarding, tentativaResposta, trilhaEstudo, desc, eq, and } from '@notaa/db';
import { GeminiAdapter } from '../ai/gemini.adapter';
import { GeminiStudyTrailSchema, StudyTrailResponse } from '@notaa/contracts';

@Injectable()
export class StudyTrailsService {
  private readonly logger = new Logger(StudyTrailsService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly gemini: GeminiAdapter,
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
    const sistema = `Você é um tutor educacional do Nota A.
O aluno de ${idade} anos do ${serie} acabou de errar questões sobre os seguintes temas: ${temasText}.
Crie uma trilha de estudo em 3 passos curtos e práticos para ele recuperar esse conhecimento.
Retorne o resultado estritamente em formato JSON contendo titulo, descricao e os passos.`;

    const { data } = await this.gemini.complete({
      sistema,
      contexto: { temasErrados: uniqueThemes },
      schema: GeminiStudyTrailSchema,
    });

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
