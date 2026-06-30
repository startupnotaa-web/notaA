import type { ItemParams } from '@notaa/contracts';
import { describe, expect, it } from 'vitest';
import { THETA_MAX, THETA_MIN } from '../model';
import { updateAbility } from '../update-ability';

function item(overrides: Partial<ItemParams> = {}): ItemParams {
  return {
    itemId: 'item-1',
    area: 'matematica',
    paramA: 1,
    paramB: 0,
    paramC: 0.2,
    ...overrides,
  };
}

describe('updateAbility', () => {
  it('aumenta theta após um acerto num item informativo', () => {
    const { theta } = updateAbility({ theta: 0, item: item(), acerto: true, tempoMs: 10000 });
    expect(theta).toBeGreaterThan(0);
  });

  it('diminui theta após um erro num item informativo', () => {
    const { theta } = updateAbility({ theta: 0, item: item(), acerto: false, tempoMs: 10000 });
    expect(theta).toBeLessThan(0);
  });

  it('retorna erroPadrao finito e positivo quando o item é informativo', () => {
    const { erroPadrao } = updateAbility({ theta: 0, item: item(), acerto: true, tempoMs: 1000 });
    expect(erroPadrao).toBeGreaterThan(0);
    expect(Number.isFinite(erroPadrao)).toBe(true);
  });

  it('nunca ultrapassa os limites THETA_MIN/THETA_MAX mesmo com passos extremos', () => {
    let theta = 0;
    for (let i = 0; i < 50; i++) {
      theta = updateAbility({
        theta,
        item: item({ paramA: 3 }),
        acerto: true,
        tempoMs: 1000,
      }).theta;
    }
    expect(theta).toBeLessThanOrEqual(THETA_MAX);
    expect(theta).toBeGreaterThanOrEqual(THETA_MIN);
  });

  it('quando o item não tem informação no ponto (probabilidade saturada), mantém theta e retorna erroPadrao infinito', () => {
    const i = item({ paramA: 2, paramB: -50, paramC: 0.2 }); // theta=0 está muito acima de b
    const { theta, erroPadrao } = updateAbility({ theta: 0, item: i, acerto: true, tempoMs: 1000 });
    expect(theta).toBe(0);
    expect(erroPadrao).toBe(Number.POSITIVE_INFINITY);
  });

  it('tempoMs não afeta o resultado (faz parte do contrato, doc 05 §9, mas não do cálculo)', () => {
    const a = updateAbility({ theta: 0, item: item(), acerto: true, tempoMs: 500 });
    const b = updateAbility({ theta: 0, item: item(), acerto: true, tempoMs: 60000 });
    expect(a).toEqual(b);
  });
});
