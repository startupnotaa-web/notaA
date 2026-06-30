import type { Perfil4D } from '@notaa/contracts';

// doc 05 §9: CognitiveProfiler infere os 4 eixos a partir de sinais
// comportamentais. Diferente do Motor TRI (Q-02) ou da rubrica de redação
// (Q-03), os 4 eixos NÃO são um instrumento psicométrico oficial a calibrar
// com especialista — são uma heurística própria do produto, versionada e
// revisável. Ainda assim: nunca afirmar um eixo sem sinal correspondente.
//
// Fase 1 (E2→E3): a única fonte de sinal disponível é a resposta de quiz
// (tempo + acerto + dificuldade do item). Isso sustenta HONESTAMENTE apenas
// o eixo Reflexivo/Impulsivo (tempo de decisão vs. acerto). Os outros 3 eixos
// (Visual/Verbal, Analítico/Holístico, Sequencial/Aleatório) permanecem em 0
// até existirem sinais próprios (autopercepção do onboarding, Detector de
// Padrão de Erro — E5, navegação na Socrática — E8). Sinais desconhecidos
// são ignorados (não geram ruído nem inventam eixo).

export const EIXO_MIN = -1;
export const EIXO_MAX = 1;

export function clampEixo(valor: number): number {
  return Math.min(EIXO_MAX, Math.max(EIXO_MIN, valor));
}

export function clampConfianca(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}

export const PERFIL_NEUTRO: Perfil4D = {
  eixoVisualVerbal: 0,
  eixoAnaliticoHolistico: 0,
  eixoSequencialAleatorio: 0,
  eixoReflexivoImpulsivo: 0,
};

/**
 * Confiança sobe com o volume de sinais já observados, mas de forma
 * assintótica e com teto baixo (0.7) enquanto só houver UMA fonte de sinal
 * (resposta de quiz) — nunca declarar confiança alta com evidência estreita.
 * `n` = total de sinais aplicáveis já processados (histórico, não só o lote atual).
 */
export function confiancaPorVolume(n: number, teto = 0.7): number {
  return clampConfianca(teto * (1 - Math.exp(-n / 20)));
}
