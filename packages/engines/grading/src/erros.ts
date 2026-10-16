/**
 * Entrada que não bate com a regra (nota fora da escala, conceito
 * desconhecido, número de notas diferente do número de pesos). O motor recusa
 * em vez de adivinhar: nota errada calculada em silêncio é pior que erro.
 */
export class EntradaInvalidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntradaInvalidaError';
  }
}
