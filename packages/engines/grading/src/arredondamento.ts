import type { Arredondamento } from '@notaa/contracts';

/**
 * Remove o ruído binário antes de arredondar: 0,1 + 0,2 vira 0,3 e
 * 1,005 × 100 vira 100,5, não 100,49999999999999. Doze dígitos significativos
 * sobram para qualquer nota numa escala de 0 a 100.
 */
function limpar(valor: number): number {
  return Number(valor.toPrecision(12));
}

export function arredondar(valor: number, regra: Arredondamento): number {
  switch (regra.tipo) {
    case 'normal': {
      const fator = 10 ** regra.casas;
      return Math.round(limpar(valor * fator)) / fator;
    }
    case 'para_cima': {
      const fator = 10 ** regra.casas;
      return Math.ceil(limpar(valor * fator)) / fator;
    }
    case 'meio_ponto': {
      const dobro = limpar(valor * 2);
      return (regra.modo === 'proximo' ? Math.round(dobro) : Math.ceil(dobro)) / 2;
    }
  }
}
