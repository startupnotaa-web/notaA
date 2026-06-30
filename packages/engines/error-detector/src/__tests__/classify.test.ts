import type { Tentativa } from '@notaa/contracts';
import { describe, expect, it } from 'vitest';
import { classify } from '../classify';

function tentativa(tempoMs: number, acerto: boolean): Tentativa {
  return { itemId: 'item-x', tempoMs, acerto, criadoEm: new Date().toISOString() };
}

describe('ErrorDetector.classify', () => {
  it('classifica como deslize_atencao quando rápido demais e histórico recente é bom', () => {
    const historicoRecente = [tentativa(10_000, true), tentativa(10_000, true), tentativa(10_000, true)];
    const { classificacao, evidencias } = classify({ tempoMs: 2_000, historicoRecente });
    expect(classificacao).toBe('deslize_atencao');
    expect(evidencias.regra).toBe('rapido_e_bom_desempenho');
  });

  it('classifica como lacuna_conhecimento quando não foi às pressas e histórico recente é fraco', () => {
    const historicoRecente = [tentativa(10_000, false), tentativa(10_000, false), tentativa(10_000, true)];
    const { classificacao, evidencias } = classify({ tempoMs: 12_000, historicoRecente });
    expect(classificacao).toBe('lacuna_conhecimento');
    expect(evidencias.regra).toBe('lento_e_baixo_desempenho');
  });

  it('usa fallback ambíguo (com confiança baixa) quando o histórico é misto', () => {
    const historicoRecente = [tentativa(10_000, true), tentativa(10_000, false), tentativa(10_000, true)];
    const { evidencias, confianca } = classify({ tempoMs: 10_000, historicoRecente });
    expect(evidencias.regra).toBe('fallback_ambiguo');
    expect(confianca).toBeLessThanOrEqual(0.4);
  });

  it('sem histórico, usa limiar absoluto fraco com confiança praticamente nula', () => {
    const { classificacao, evidencias, confianca } = classify({ tempoMs: 1_000, historicoRecente: [] });
    expect(classificacao).toBe('deslize_atencao');
    expect(evidencias.regra).toBe('sem_historico');
    expect(confianca).toBe(0);
  });

  it('confiança nas regras claras cresce com o volume de histórico, sem passar do teto (0.85)', () => {
    const poucos = classify({
      tempoMs: 2_000,
      historicoRecente: [tentativa(10_000, true), tentativa(10_000, true), tentativa(10_000, true)],
    });
    const muitos = classify({
      tempoMs: 2_000,
      historicoRecente: Array.from({ length: 30 }, () => tentativa(10_000, true)),
    });
    expect(muitos.confianca).toBeGreaterThan(poucos.confianca);
    expect(muitos.confianca).toBeLessThanOrEqual(0.85);
  });

  it('nunca devolve confiança fora de [0,1]', () => {
    const casos = [
      classify({ tempoMs: 1, historicoRecente: [] }),
      classify({ tempoMs: 999_999, historicoRecente: Array.from({ length: 100 }, () => tentativa(1, false)) }),
    ];
    for (const c of casos) {
      expect(c.confianca).toBeGreaterThanOrEqual(0);
      expect(c.confianca).toBeLessThanOrEqual(1);
    }
  });
});
