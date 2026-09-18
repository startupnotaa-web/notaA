import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Database,
  and,
  bancoDeItens,
  desc,
  eq,
  habilidadeEstudante,
  perfilOnboarding,
  tentativaResposta,
  usuario,
} from '@notaa/db';
import {
  FATOS_VAZIOS,
  montarBlocoAluno,
  type Autopercepcao,
  type CanalIa,
  type FatosAluno,
  type NivelProficiencia,
  type OpcoesBloco,
  type TracoCognitivo,
} from '@notaa/prompts';
import { DB_CLIENT } from '../../db/db.tokens';
import { ProfilerService } from '../profiler/profiler.service';

/**
 * Coleta TUDO que o sistema sabe sobre o aluno e entrega ao pacote de prompts
 * como fatos normalizados (`FatosAluno`), de onde sai o "bloco do aluno" que
 * todo prompt de canal recebe em `{{blocoAluno}}`.
 *
 * Fontes:
 *   - usuario.nome
 *   - perfil_onboarding (objetivo, estilo autodeclarado, dificuldades, rotina, autopercepção, idade, série)
 *   - Perfil Cognitivo 4D via ProfilerService (eixos + confiança + recomendações)
 *   - habilidade_estudante (theta por área, só quando já houve medição)
 *   - tentativa_resposta (acurácia recente por área e temas errados)
 *
 * NUNCA lê `dado_sensivel_estudante` (neurodivergência/consentimento): é dado
 * sensível com RLS estrita (I10/doc 10) e não pode ir para um LLM externo.
 *
 * Toda leitura é best-effort: uma fonte indisponível vira "sem dado", nunca
 * derruba a chamada de IA (o aluno recebe um bloco neutro).
 */
@Injectable()
export class StudentProfileService {
  private readonly logger = new Logger('StudentProfile');

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly profiler: ProfilerService,
  ) {}

  /** Bloco pronto para injetar em `{{blocoAluno}}` do prompt do canal. */
  async montarBloco(estudanteId: string, canal: CanalIa, opcoes: OpcoesBloco = {}): Promise<string> {
    const fatos = await this.coletarFatos(estudanteId);
    return montarBlocoAluno(fatos, canal, opcoes);
  }

  async coletarFatos(estudanteId: string): Promise<FatosAluno> {
    const [user, onboarding, cognitivo, habilidades, tentativas] = await Promise.all([
      this.seguro('usuario', () =>
        this.db.select({ nome: usuario.nome }).from(usuario).where(eq(usuario.id, estudanteId)).limit(1).then((r) => r[0]),
      ),
      this.seguro('perfil_onboarding', () =>
        this.db
          .select({
            objetivoEnem: perfilOnboarding.objetivoEnem,
            estilo: perfilOnboarding.estiloAprendizagemAutodeclarado,
            dificuldades: perfilOnboarding.dificuldades,
            rotina: perfilOnboarding.rotinaEstudo,
            autopercepcao: perfilOnboarding.autopercepcao,
            idade: perfilOnboarding.idade,
            serie: perfilOnboarding.serie,
          })
          .from(perfilOnboarding)
          .where(eq(perfilOnboarding.estudanteId, estudanteId))
          .limit(1)
          .then((r) => r[0]),
      ),
      this.seguro('perfil_4d', () => this.profiler.getPerfil(estudanteId)),
      this.seguro('habilidade', () =>
        this.db
          .select({
            area: habilidadeEstudante.areaConhecimento,
            theta: habilidadeEstudante.theta,
            erroPadrao: habilidadeEstudante.erroPadrao,
          })
          .from(habilidadeEstudante)
          .where(eq(habilidadeEstudante.estudanteId, estudanteId)),
      ),
      this.seguro('tentativas', () =>
        this.db
          .select({
            acerto: tentativaResposta.acerto,
            temasErro: tentativaResposta.temasErro,
            area: bancoDeItens.areaConhecimento,
          })
          .from(tentativaResposta)
          .innerJoin(bancoDeItens, eq(bancoDeItens.id, tentativaResposta.itemId))
          .where(and(eq(tentativaResposta.estudanteId, estudanteId)))
          .orderBy(desc(tentativaResposta.criadoEm))
          .limit(TENTATIVAS_RECENTES),
      ),
    ]);

    const fatos: FatosAluno = { ...FATOS_VAZIOS };

    fatos.nome = user?.nome?.trim() || null;
    fatos.idade = onboarding?.idade ?? null;
    fatos.serie = onboarding?.serie?.trim() || null;
    fatos.objetivo = legivelObjetivo(onboarding?.objetivoEnem);
    fatos.estilosDeclarados = lerEstilos(onboarding?.estilo);
    fatos.dificuldadesDeclaradas = lerLista(onboarding?.dificuldades);
    fatos.minutosPorDia = lerMinutos(onboarding?.rotina);
    fatos.autopercepcao = lerAutopercepcao(onboarding?.autopercepcao);

    if (cognitivo) {
      fatos.confiancaPerfil = Number(cognitivo.confianca ?? 0) || 0;
      fatos.tracosObservados = tracosDoPerfil4D(cognitivo, fatos.confiancaPerfil);
      fatos.recomendacoesAtivas = (cognitivo.recomendacoesAtivas ?? []).filter(Boolean);
    }

    fatos.nivelPorArea = niveisPorArea(habilidades ?? [], tentativas ?? []);
    fatos.temasErradosRecentes = temasErrados(tentativas ?? []);

    return fatos;
  }

  private async seguro<T>(fonte: string, op: () => Promise<T>): Promise<T | undefined> {
    try {
      return await op();
    } catch (err) {
      this.logger.warn(`fonte '${fonte}' indisponível ao montar perfil do aluno: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    }
  }
}

// ── Normalização (funções puras, testáveis) ──────────────────────────────────

const TENTATIVAS_RECENTES = 60;
/** Abaixo disso o eixo é neutro demais para afirmar tendência (mesmo limiar de antes). */
const LIMIAR_EIXO = 0.15;
/** Mínimo de respostas numa área para chamar de "nível medido". */
const MIN_TENTATIVAS_AREA = 5;
/** Marcadores internos gravados em temas_erro que não são tema de verdade. */
const TEMAS_INTERNOS = new Set(['IA_ADAPTATIVA', 'SIMULADO', 'ENEM']);

const OBJETIVO_LEGIVEL: Record<string, string> = {
  medicina: 'Medicina',
  direito: 'Direito',
  engenharia: 'Engenharia',
  ti: 'Tecnologia / TI',
};

export function legivelObjetivo(valor: string | null | undefined): string | null {
  const v = valor?.trim();
  if (!v || v === 'outro') return null;
  return OBJETIVO_LEGIVEL[v.toLowerCase()] ?? v;
}

function lerLista(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];
}

function lerEstilos(valor: unknown): string[] {
  if (valor && typeof valor === 'object' && 'comoAprendeMelhor' in valor) {
    return lerLista((valor as { comoAprendeMelhor: unknown }).comoAprendeMelhor);
  }
  return [];
}

function lerMinutos(valor: unknown): number | null {
  if (valor && typeof valor === 'object' && 'minutosPorDia' in valor) {
    const n = Number((valor as { minutosPorDia: unknown }).minutosPorDia);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function lerAutopercepcao(valor: unknown): Autopercepcao | null {
  if (valor && typeof valor === 'object' && 'nivelAutopercebido' in valor) {
    const v = (valor as { nivelAutopercebido: unknown }).nivelAutopercebido;
    if (v === 'passo_a_passo' || v === 'desafio') return v;
  }
  return null;
}

/**
 * Traduz os 4 eixos (-1..1) em traços nomeados. Só afirma quando há confiança
 * (> 0) e o eixo passa do limiar — evita inventar perfil de aluno sem sinal.
 */
export function tracosDoPerfil4D(
  perfil: {
    eixoVisualVerbal: number;
    eixoAnaliticoHolistico: number;
    eixoSequencialAleatorio: number;
    eixoReflexivoImpulsivo: number;
  },
  confianca: number,
): TracoCognitivo[] {
  if (!(confianca > 0)) return [];
  const eixos: Array<[number, TracoCognitivo, TracoCognitivo]> = [
    [perfil.eixoVisualVerbal, 'visual', 'verbal'],
    [perfil.eixoAnaliticoHolistico, 'analitico', 'holistico'],
    [perfil.eixoSequencialAleatorio, 'sequencial', 'global'],
    [perfil.eixoReflexivoImpulsivo, 'reflexivo', 'impulsivo'],
  ];
  return eixos
    .filter(([valor]) => Number.isFinite(valor) && Math.abs(valor) >= LIMIAR_EIXO)
    .map(([valor, negativo, positivo]) => (valor < 0 ? negativo : positivo));
}

/**
 * Nível por área. Prioridade: acurácia recente (dado real de respostas) e, na
 * falta dela, theta do TRI — mas só quando o erro-padrão mostra que já houve
 * medição (o default 1 significa "nunca calibrado", e theta 0 não é "médio").
 */
export function niveisPorArea(
  habilidades: Array<{ area: string; theta: string | number; erroPadrao: string | number }>,
  tentativas: Array<{ area: string; acerto: boolean }>,
): Partial<Record<string, NivelProficiencia>> {
  const niveis: Partial<Record<string, NivelProficiencia>> = {};

  const porArea = new Map<string, { total: number; acertos: number }>();
  for (const t of tentativas) {
    const atual = porArea.get(t.area) ?? { total: 0, acertos: 0 };
    atual.total += 1;
    if (t.acerto) atual.acertos += 1;
    porArea.set(t.area, atual);
  }
  for (const [area, { total, acertos }] of porArea) {
    if (total < MIN_TENTATIVAS_AREA) continue;
    const taxa = acertos / total;
    niveis[area] = taxa < 0.4 ? 'iniciante' : taxa < 0.7 ? 'intermediario' : 'avancado';
  }

  for (const h of habilidades) {
    if (niveis[h.area]) continue;
    const erroPadrao = Number(h.erroPadrao);
    const theta = Number(h.theta);
    if (!Number.isFinite(theta) || !(erroPadrao < 1)) continue;
    niveis[h.area] = theta <= -0.75 ? 'iniciante' : theta >= 0.75 ? 'avancado' : 'intermediario';
  }

  return niveis;
}

export function temasErrados(tentativas: Array<{ acerto: boolean; temasErro: unknown }>): string[] {
  const temas: string[] = [];
  for (const t of tentativas) {
    if (t.acerto) continue;
    for (const tema of lerLista(t.temasErro)) {
      if (TEMAS_INTERNOS.has(tema)) continue;
      if (!temas.includes(tema)) temas.push(tema);
      if (temas.length >= 6) return temas;
    }
  }
  return temas;
}
