import type { SocraticResponse } from '@notaa/contracts';

// Guardrails determinísticos de IA (doc 06 §2.3/§4 — I3 e I6). Funções PURAS,
// testáveis e independentes do provedor de IA: a decisão é regra de negócio da
// camada de Domínio, NUNCA delegada ao LLM.
//
// ⚠️ Heurística baseline v1 (string matching). Não é um classificador calibrado —
// é a primeira linha determinística que faltava. Substituível por um modelo
// dedicado sem mudar quem consome (RiskDetectorService).

type Severidade = 'baixa' | 'media' | 'alta';
type CareProtocol = Extract<SocraticResponse, { tipo: 'care_protocol' }>;
type DegradedStatic = Extract<SocraticResponse, { tipo: 'degraded_static' }>;

/** Remove acentos e caixa para casar padrões de forma robusta. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Sinais de sofrimento/risco. ALTA = ideação de autolesão/suicídio explícita.
const SINAIS_ALTA = [
  'me matar',
  'me mato',
  'quero morrer',
  'queria morrer',
  'vontade de morrer',
  'nao quero viver',
  'nao quero mais viver',
  'nao aguento mais viver',
  'tirar minha vida',
  'tirar a minha vida',
  'acabar com a minha vida',
  'me suicidar',
  'suicid',
  'me cortar',
  'cortar os pulsos',
  'automutil',
  'me machucar',
  'sumir pra sempre',
  'desaparecer pra sempre',
];
const SINAIS_MEDIA = [
  'nao aguento mais',
  'quero desistir de tudo',
  'odeio minha vida',
  'me sinto um lixo',
  'ninguem se importa comigo',
  'nao vejo saida',
  'nao vejo sentido em nada',
];

export interface ResultadoTriagem {
  risco: boolean;
  sinais: string[];
  severidade: Severidade;
}

/**
 * I6 — triagem determinística de sinais de risco no texto do estudante. Roda
 * ANTES do provedor de IA: se acusar, o fluxo desvia para o protocolo de cuidado
 * humano em vez de continuar a tutoria/correção (doc 01 §1.5).
 */
export function detectarSinalDeRisco(texto: string): ResultadoTriagem {
  const t = normalizar(texto);
  const altas = SINAIS_ALTA.filter((s) => t.includes(s));
  const medias = SINAIS_MEDIA.filter((s) => t.includes(s));

  if (altas.length > 0) return { risco: true, sinais: altas, severidade: 'alta' };
  if (medias.length > 0) return { risco: true, sinais: medias, severidade: 'media' };
  return { risco: false, sinais: [], severidade: 'baixa' };
}

// I3 — padrões que denunciam a entrega da RESPOSTA FINAL (o que o tutor socrático
// nunca pode fazer). Alta precisão de propósito: melhor deixar passar um caso
// duvidoso do que rebaixar uma pergunta-guia legítima.
const PADROES_RESPOSTA_DIRETA = [
  /\ba resposta (e|sera|seria|correta|certa|final)\b/,
  /\bresposta\s*:/,
  /\bo gabarito (e|sera)\b/,
  /\ba solucao (e|sera|seria)\b/,
  /\bo resultado (e|sera|final)\b/,
  /\bportanto,?\s*a resposta\b/,
  /\bbasta (responder|colocar|marcar|substituir)\b/,
];

/** I3 — true se o texto contém uma afirmação de resposta final. */
export function contemRespostaDireta(texto: string): boolean {
  const t = normalizar(texto);
  return PADROES_RESPOSTA_DIRETA.some((re) => re.test(t));
}

// Recursos de apoio reais e públicos (não é dado calibrável) — CVV, linha
// nacional de prevenção, 24h e gratuita.
export const RECURSOS_APOIO: CareProtocol['recursos'] = [
  { nome: 'CVV — Centro de Valorização da Vida', contato: '188', url: 'https://www.cvv.org.br' },
];

export function severidadeParaEscalonamento(sev: Severidade): CareProtocol['escalonamento'] {
  // Risco alto envolve um humano responsável; demais geram flag interna auditável.
  return sev === 'alta' ? 'responsavel_escola' : 'flag_interno';
}

/** Resposta determinística do protocolo de cuidado humano (I6). */
export function construirCareProtocol(severidade: Severidade): CareProtocol {
  return {
    tipo: 'care_protocol',
    mensagem:
      'Percebi que você pode estar passando por um momento muito difícil — e isso importa mais do que qualquer questão agora. Você não está sozinho. Falar com alguém ajuda: o CVV atende 24h, de graça e em sigilo, pelo 188. Se houver risco imediato, procure o 192 (SAMU) ou alguém de confiança perto de você.',
    recursos: RECURSOS_APOIO,
    escalonamento: severidadeParaEscalonamento(severidade),
  };
}

/** Fallback guiado quando o guardrail I3 barra uma resposta direta. */
export function fallbackGuiado(): DegradedStatic {
  return {
    tipo: 'degraded_static',
    mensagem:
      'Quase lá — mas vou segurar a resposta pronta de propósito, porque o objetivo é você chegar nela. Vamos por partes:',
    dicasEstaticas: [
      'Releia o enunciado e escreva, com suas palavras, o que ele está pedindo.',
      'Liste o que você já sabe e o que ainda falta para resolver.',
      'Qual seria o PRIMEIRO passo para ligar o que você tem ao que falta?',
    ],
  };
}
