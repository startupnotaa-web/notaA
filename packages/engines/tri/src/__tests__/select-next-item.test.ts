import type { ItemParams } from '@notaa/contracts';
import { describe, expect, it } from 'vitest';
import { PoolEsgotadoError, selectNextItem } from '../select-next-item';

function item(overrides: Partial<ItemParams>): ItemParams {
  return {
    itemId: 'item-x',
    area: 'matematica',
    paramA: 1,
    paramB: 0,
    paramC: 0.2,
    ...overrides,
  };
}

describe('selectNextItem', () => {
  it('escolhe o item com maior informação de Fisher no theta atual', () => {
    const pool: ItemParams[] = [
      item({ itemId: 'longe', paramB: 3, paramA: 1 }), // dificuldade longe do theta=0
      item({ itemId: 'perto', paramB: 0, paramA: 1.5 }), // dificuldade igual ao theta, mais discriminativo
      item({ itemId: 'medio', paramB: 1.5, paramA: 1 }),
    ];
    const { itemId } = selectNextItem({ theta: 0, area: 'matematica', expostos: [], pool });
    expect(itemId).toBe('perto');
  });

  it('exclui itens já expostos', () => {
    const pool: ItemParams[] = [
      item({ itemId: 'A', paramB: 0 }),
      item({ itemId: 'B', paramB: 0.1 }),
    ];
    const { itemId } = selectNextItem({
      theta: 0,
      area: 'matematica',
      expostos: ['A'],
      pool,
    });
    expect(itemId).toBe('B');
  });

  it('filtra por área — ignora itens de outras áreas mesmo que mais informativos', () => {
    const pool: ItemParams[] = [
      item({ itemId: 'humanas-otimo', area: 'humanas', paramB: 0, paramA: 5 }),
      item({ itemId: 'matematica-ok', area: 'matematica', paramB: 0, paramA: 1 }),
    ];
    const { itemId } = selectNextItem({ theta: 0, area: 'matematica', expostos: [], pool });
    expect(itemId).toBe('matematica-ok');
  });

  it('lança PoolEsgotadoError quando não há candidatos (todos expostos ou de outra área)', () => {
    const pool: ItemParams[] = [item({ itemId: 'A', area: 'matematica' })];
    expect(() => selectNextItem({ theta: 0, area: 'matematica', expostos: ['A'], pool })).toThrow(
      PoolEsgotadoError,
    );

    expect(() => selectNextItem({ theta: 0, area: 'humanas', expostos: [], pool })).toThrow(
      PoolEsgotadoError,
    );
  });

  it('é determinístico em caso de empate (mantém o primeiro do pool)', () => {
    const pool: ItemParams[] = [
      item({ itemId: 'primeiro', paramB: 0, paramA: 1 }),
      item({ itemId: 'segundo', paramB: 0, paramA: 1 }), // parâmetros idênticos -> mesma informação
    ];
    const { itemId } = selectNextItem({ theta: 0, area: 'matematica', expostos: [], pool });
    expect(itemId).toBe('primeiro');
  });
});
