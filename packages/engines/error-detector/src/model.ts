export function clampConfianca(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}

/**
 * Cresce rápido com poucos sinais — diferente do Cognitive Profiler (que supõe
 * dezenas de sinais comportamentais), aqui cada "sinal" é uma tentativa de quiz
 * recente do próprio estudante, e já com poucas tentativas há base razoável
 * para uma comparação (tempo/acerto desta resposta vs. o padrão recente dele).
 */
export function confiancaPorVolume(n: number, teto: number): number {
  return clampConfianca(teto * (1 - Math.exp(-n / 5)));
}
