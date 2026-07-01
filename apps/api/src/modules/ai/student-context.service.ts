import { Inject, Injectable } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import { Database, usuario, perfilOnboarding, perfilCognitivo4d, eq } from '@notaa/db';

/**
 * Agente 2 — "Contexto do Aluno". Monta um PROMPT DE SISTEMA em linguagem
 * natural para a IA socrática direta (POST /socratic/chat), a partir de:
 *   - `usuario.nome`
 *   - `perfil_onboarding` (objetivoEnem, dificuldades)  — doc 04 §3
 *   - `perfil_cognitivo_4d` (4 eixos + confiança)        — estilo de aprendizagem
 *
 * NUNCA lê `dado_sensivel_estudante` (neurodivergência/consentimento): é dado
 * sensível com RLS estrita (I10/doc 10) e não pode ir para um LLM externo.
 */
@Injectable()
export class StudentContextService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  /** Constrói o system prompt personalizado do tutor socrático para o aluno. */
  async buildSocraticSystemPrompt(estudanteId: string): Promise<string> {
    const [user, onboarding, cognitivo] = await Promise.all([
      this.db
        .select({ nome: usuario.nome })
        .from(usuario)
        .where(eq(usuario.id, estudanteId))
        .limit(1)
        .then((r) => r[0]),
      this.db
        .select({
          objetivoEnem: perfilOnboarding.objetivoEnem,
          dificuldades: perfilOnboarding.dificuldades,
        })
        .from(perfilOnboarding)
        .where(eq(perfilOnboarding.estudanteId, estudanteId))
        .limit(1)
        .then((r) => r[0]),
      this.db
        .select({
          vv: perfilCognitivo4d.eixoVisualVerbal,
          ah: perfilCognitivo4d.eixoAnaliticoHolistico,
          sa: perfilCognitivo4d.eixoSequencialAleatorio,
          ri: perfilCognitivo4d.eixoReflexivoImpulsivo,
          confianca: perfilCognitivo4d.confianca,
        })
        .from(perfilCognitivo4d)
        .where(eq(perfilCognitivo4d.estudanteId, estudanteId))
        .limit(1)
        .then((r) => r[0]),
    ]);

    const nome = user?.nome?.trim() || 'estudante';
    const objetivo = onboarding?.objetivoEnem?.trim() || 'ainda não informado';
    const dificuldades =
      Array.isArray(onboarding?.dificuldades) && onboarding.dificuldades.length > 0
        ? (onboarding.dificuldades as string[]).join(', ')
        : 'ainda não informadas';
    const estilo = this.descreverEstiloCognitivo(cognitivo);

    return [
      'Você é um tutor socrático da plataforma Nota A, especializado na preparação para o ENEM.',
      'Seu método é guiar o raciocínio do aluno com perguntas progressivas — NUNCA entregue a resposta pronta.',
      'Responda em português do Brasil, de forma acolhedora e no nível de um estudante do ensino médio.',
      '',
      'Perfil do aluno:',
      `- Nome: ${nome}`,
      `- Objetivo no ENEM: ${objetivo}`,
      `- Principais dificuldades: ${dificuldades}`,
      `- Estilo de aprendizagem (perfil cognitivo): ${estilo}`,
      '',
      'Adapte sua linguagem, seus exemplos e o ritmo das perguntas a esse perfil.',
    ].join('\n');
  }

  /**
   * Deriva um rótulo legível a partir dos 4 eixos do Perfil Cognitivo 4D
   * (valores -1..1). Só afirma uma tendência quando há confiança (> 0) e o eixo
   * está acima de um limiar — evita "inventar" perfil de um aluno sem sinal.
   */
  private descreverEstiloCognitivo(
    cog:
      | { vv: string | null; ah: string | null; sa: string | null; ri: string | null; confianca: string | null }
      | undefined,
  ): string {
    if (!cog) return 'ainda em mapeamento';
    const confianca = Number(cog.confianca ?? '0');
    if (!(confianca > 0)) return 'ainda em mapeamento (sem sinal suficiente)';

    const LIMIAR = 0.15; // abaixo disso o eixo é neutro demais para afirmar tendência
    const eixos: Array<[number, string, string]> = [
      [Number(cog.vv ?? '0'), 'visual', 'verbal'],
      [Number(cog.ah ?? '0'), 'analítico', 'holístico'],
      [Number(cog.sa ?? '0'), 'sequencial', 'global'],
      [Number(cog.ri ?? '0'), 'reflexivo', 'impulsivo'],
    ];
    const tracos = eixos
      .filter(([valor]) => Math.abs(valor) >= LIMIAR)
      .map(([valor, poloNegativo, poloPositivo]) => (valor < 0 ? poloNegativo : poloPositivo));

    return tracos.length > 0 ? tracos.join(', ') : 'equilibrado nos eixos cognitivos';
  }
}
