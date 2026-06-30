import type { ItemParams } from '@notaa/contracts';
import { describe, expect, it } from 'vitest';
import { clampTheta, informacaoFisher, probabilidadeAcerto, THETA_MAX, THETA_MIN } from '../model';

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

describe('probabilidadeAcerto (3PL)', () => {
  it('no ponto theta=b (dificuldade), retorna o ponto médio entre c e 1', () => {
    const i = item({ paramB: 0.5, paramC: 0.2 });
    const p = probabilidadeAcerto(0.5, i);
    expect(p).toBeCloseTo(0.2 + 0.8 * 0.5, 5); // c + (1-c)*0.5
  });

  it('é monotonicamente crescente em theta', () => {
    const i = item();
    const thetas = [-3, -1, 0, 1, 3];
    const probs = thetas.map((t) => probabilidadeAcerto(t, i));
    for (let k = 1; k < probs.length; k++) {
      expect(probs[k]).toBeGreaterThan(probs[k - 1]!);
    }
  });

  it('tende a c quando theta -> -infinito (nunca abaixo do acerto casual)', () => {
    const i = item({ paramC: 0.25 });
    const p = probabilidadeAcerto(-50, i);
    expect(p).toBeCloseTo(0.25, 3);
  });

  it('tende a 1 quando theta -> +infinito', () => {
    const i = item({ paramC: 0.2 });
    const p = probabilidadeAcerto(50, i);
    expect(p).toBeCloseTo(1, 5);
  });
});

describe('informacaoFisher', () => {
  it('é positiva quando theta está próximo da dificuldade do item', () => {
    const i = item({ paramA: 1.2, paramB: 0, paramC: 0.2 });
    expect(informacaoFisher(0, i)).toBeGreaterThan(0);
  });

  it('é maior para um item mais discriminativo (paramA maior), no mesmo ponto', () => {
    const fraco = item({ paramA: 0.5, paramB: 0 });
    const forte = item({ paramA: 2, paramB: 0 });
    expect(informacaoFisher(0, forte)).toBeGreaterThan(informacaoFisher(0, fraco));
  });

  it('cai para 0 num extremo onde a probabilidade satura (sem overflow/erro)', () => {
    const i = item({ paramA: 2, paramB: 0, paramC: 0.2 });
    expect(informacaoFisher(50, i)).toBe(0);
  });
});

describe('clampTheta', () => {
  it('limita ao intervalo [THETA_MIN, THETA_MAX]', () => {
    expect(clampTheta(100)).toBe(THETA_MAX);
    expect(clampTheta(-100)).toBe(THETA_MIN);
    expect(clampTheta(0.5)).toBe(0.5);
  });
});
