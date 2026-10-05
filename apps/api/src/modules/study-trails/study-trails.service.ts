import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import { Database, trilhaEstudo, desc, eq } from '@notaa/db';
import { LLM_PROVIDER } from '../ai/ai.tokens';
import { StudentProfileService } from '../ai/student-profile.service';
import { GeminiStudyTrailSchema, StudyTrailResponse, type LLMProviderPort } from '@notaa/contracts';
import { PROMPT_TRILHA_TEMPLATE, montarBlocoAluno, montarPromptTrilha, nomeArea } from '@notaa/prompts';
import { z } from 'zod';
import * as Sentry from '@sentry/node';
@Injectable()
export class StudyTrailsService {
  private readonly logger = new Logger(StudyTrailsService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    @Inject(LLM_PROVIDER) private readonly llm: LLMProviderPort,
    private readonly studentProfile: StudentProfileService,
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

    // 2. Fatos do aluno (uma coleta só): o bloco vai ao prompt; os erros
    //    recentes e o nível por área definem os temas da trilha.
    const fatos = await this.studentProfile.coletarFatos(estudanteId);
    const blocoAluno = montarBlocoAluno(fatos, 'trilha');
    const temas = temasDaTrilha(fatos);

    // 3. Generate via Gemini
    const sistema = montarPromptTrilha({ blocoAluno, temas: temas.texto });

    let data: z.infer<typeof GeminiStudyTrailSchema>;
    try {
      const result = await this.llm.complete({
        sistema,
        contexto: { temas: temas.lista, origemDosTemas: temas.origem },
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

/**
 * Temas da trilha, em ordem de evidência: erros recentes com tema real; senão
 * as áreas onde o nível medido é mais baixo; senão as dificuldades declaradas.
 * Nunca "Temas variados": se não há sinal, o prompt é avisado e monta uma
 * trilha de diagnóstico inicial em vez de fingir personalização.
 */
export function temasDaTrilha(fatos: {
  temasErradosRecentes: string[];
  nivelPorArea: Partial<Record<string, 'iniciante' | 'intermediario' | 'avancado'>>;
  dificuldadesDeclaradas: string[];
}): { lista: string[]; origem: string; texto: string } {
  if (fatos.temasErradosRecentes.length > 0) {
    const lista = fatos.temasErradosRecentes.slice(0, 4);
    return {
      lista,
      origem: 'erros recentes em questões',
      texto: `Ele errou recentemente questões sobre: ${lista.join(', ')}. A trilha recupera esses temas.`,
    };
  }

  const areasFracas = Object.entries(fatos.nivelPorArea)
    .filter(([, nivel]) => nivel === 'iniciante')
    .map(([area]) => nomeArea(area));
  if (areasFracas.length > 0) {
    return {
      lista: areasFracas,
      origem: 'áreas com nível medido iniciante',
      texto: `Não há tema específico de erro, mas o nível medido dele é iniciante em: ${areasFracas.join(', ')}. Escolha o fundamento mais cobrado no ENEM nessa área.`,
    };
  }

  if (fatos.dificuldadesDeclaradas.length > 0) {
    return {
      lista: fatos.dificuldadesDeclaradas,
      origem: 'dificuldades declaradas no onboarding',
      texto: `Ainda não há erros registrados. Ele declarou dificuldade em: ${fatos.dificuldadesDeclaradas.join(', ')}. Monte uma trilha de diagnóstico inicial nessa área, começando pelo fundamento mais cobrado no ENEM.`,
    };
  }

  return {
    lista: [],
    origem: 'nenhuma (aluno sem histórico)',
    texto:
      'Ainda não há erros registrados nem dificuldade declarada. Monte uma trilha de diagnóstico inicial: passos curtos que fazem o aluno responder questões de áreas diferentes no Nota A para o sistema descobrir onde ele precisa de ajuda. Diga isso na descrição.',
  };
}
