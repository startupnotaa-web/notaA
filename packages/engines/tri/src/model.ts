import type { ItemParams } from '@notaa/contracts';

// Modelo 3PL (Birnbaum) puro — sem estado, sem I/O. doc 05 §9: MotorTRI não
// conhece HTTP, DB nem IA. Convenção: métrica logística direta (sem a
// constante de escala D=1,7 usada por algumas implementações em métrica
// normal) — qualquer recalibração de parâmetros (Q-02, doc 01 §8) precisa
// usar esta MESMA convenção, ou os parâmetros a/b não terão o significado
// esperado. Os parâmetros dos itens entram marcados `nao_calibrado` (doc 04
// §4) até validação com especialista.

/** Probabilidade de acerto pelo modelo 3PL: c + (1-c) / (1 + e^(-a(θ-b))). */
export function probabilidadeAcerto(theta: number, item: ItemParams): number {
  const { paramA: a, paramB: b, paramC: c } = item;
  const logistica = 1 / (1 + Math.exp(-a * (theta - b)));
  return c + (1 - c) * logistica;
}

/**
 * Informação de Fisher do item no ponto θ (Lord, 1980) — quanto maior, mais o
 * item discrimina habilidade naquele ponto. Usada pela seleção adaptativa
 * (maximizar informação) e pela atualização de θ (passo de Newton).
 */
export function informacaoFisher(theta: number, item: ItemParams): number {
  const { paramA: a, paramC: c } = item;
  const p = probabilidadeAcerto(theta, item);
  if (p <= c || p >= 1) return 0; // evita divisão por ~0 nos extremos
  const numerador = (p - c) ** 2 * (1 - p);
  const denominador = p * (1 - c) ** 2;
  return a ** 2 * (numerador / denominador);
}

export const THETA_MIN = -4;
export const THETA_MAX = 4;

export function clampTheta(theta: number): number {
  return Math.min(THETA_MAX, Math.max(THETA_MIN, theta));
}
