import type { AreaConhecimento, ItemParams } from '@notaa/contracts';
import { informacaoFisher } from './model';

export class PoolEsgotadoError extends Error {
  constructor(area: AreaConhecimento) {
    super(`Nenhum item disponível para a área "${area}" (pool esgotado ou todos já expostos).`);
  }
}

/**
 * Seleção adaptativa por máxima informação (método padrão em CAT — testes
 * adaptativos computadorizados): entre os itens da área ainda não expostos,
 * escolhe o que maximiza a informação de Fisher no θ atual do estudante.
 *
 * Em empate, mantém a ordem original do pool (determinístico — facilita
 * teste e auditoria; não há razão pedagógica para desempate aleatório aqui).
 */
export function selectNextItem(input: {
  theta: number;
  area: AreaConhecimento;
  expostos: string[];
  pool: ItemParams[];
}): { itemId: string } {
  const { theta, area, expostos, pool } = input;
  const expostosSet = new Set(expostos);

  const candidatos = pool.filter((item) => item.area === area && !expostosSet.has(item.itemId));

  if (candidatos.length === 0) {
    throw new PoolEsgotadoError(area);
  }

  let melhor = candidatos[0]!;
  let melhorInformacao = informacaoFisher(theta, melhor);

  for (const candidato of candidatos.slice(1)) {
    const informacao = informacaoFisher(theta, candidato);
    if (informacao > melhorInformacao) {
      melhor = candidato;
      melhorInformacao = informacao;
    }
  }

  return { itemId: melhor.itemId };
}
