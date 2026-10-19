import type { Escala, NotaLancada } from '@notaa/contracts';
import { EntradaInvalidaError } from './erros';

/** Converte a nota lançada (número ou conceito) no número usado no cálculo. */
export function valorDaNota(escala: Escala, nota: NotaLancada): number {
  if (typeof nota === 'string') {
    if (escala.tipo !== 'conceitos') {
      throw new EntradaInvalidaError(`Conceito "${nota}" lançado numa escala numérica.`);
    }
    const faixa = escala.faixas.find((f) => f.conceito.toUpperCase() === nota.trim().toUpperCase());
    if (!faixa) throw new EntradaInvalidaError(`Conceito "${nota}" não existe nesta escala.`);
    return faixa.valor;
  }
  if (!Number.isFinite(nota) || nota < 0 || nota > escala.maximo) {
    throw new EntradaInvalidaError(`Nota ${nota} fora da escala de 0 a ${escala.maximo}.`);
  }
  return nota;
}

/**
 * Conceito de uma nota. Faixas são [min, max), exceto a última, que inclui o
 * máximo. `null` em escala numérica.
 */
export function conceitoDe(escala: Escala, nota: number): string | null {
  if (escala.tipo !== 'conceitos') return null;
  const ordenadas = [...escala.faixas].sort((a, b) => a.min - b.min);
  const ultima = ordenadas[ordenadas.length - 1]!;
  if (nota === ultima.max) return ultima.conceito;
  return ordenadas.find((f) => nota >= f.min && nota < f.max)?.conceito ?? null;
}
