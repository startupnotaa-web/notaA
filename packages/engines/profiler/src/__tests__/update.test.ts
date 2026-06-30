import type { SinalComportamental } from '@notaa/contracts';
import { describe, expect, it } from 'vitest';
import { PERFIL_NEUTRO } from '../model';
import { SINAL_RESPOSTA_QUIZ } from '../sinal-quiz';
import { update } from '../update';

function sinalQuiz(tempoMs: number, acerto: boolean): SinalComportamental {
  return { tipo: SINAL_RESPOSTA_QUIZ, valor: { tempoMs, acerto }, capturadoEm: new Date().toISOString() };
}

describe('CognitiveProfiler.update', () => {
  it('move eixoReflexivoImpulsivo em direção a +1 (impulsivo) com resposta rápida e errada', () => {
    const { perfil } = update({ atual: PERFIL_NEUTRO, sinais: [sinalQuiz(1000, false)] });
    expect(perfil.eixoReflexivoImpulsivo).toBeGreaterThan(0);
  });

  it('move eixoReflexivoImpulsivo em direção a -1 (reflexivo) com resposta lenta e certa', () => {
    const { perfil } = update({ atual: PERFIL_NEUTRO, sinais: [sinalQuiz(30000, true)] });
    expect(perfil.eixoReflexivoImpulsivo).toBeLessThan(0);
  });

  it('ignora sinais ambíguos (rápida+certa, lenta+errada) — não move o eixo', () => {
    const { perfil } = update({
      atual: PERFIL_NEUTRO,
      sinais: [sinalQuiz(1000, true), sinalQuiz(30000, false)],
    });
    expect(perfil.eixoReflexivoImpulsivo).toBe(0);
  });

  it('ignora sinais de tipo desconhecido', () => {
    const { perfil, confianca } = update({
      atual: PERFIL_NEUTRO,
      sinais: [{ tipo: 'tipo_futuro_desconhecido', valor: {}, capturadoEm: new Date().toISOString() }],
    });
    expect(perfil).toEqual(PERFIL_NEUTRO);
    expect(confianca).toBe(0);
  });

  it('não move os outros 3 eixos (sem fonte de sinal nesta fase)', () => {
    const { perfil } = update({ atual: PERFIL_NEUTRO, sinais: [sinalQuiz(1000, false)] });
    expect(perfil.eixoVisualVerbal).toBe(0);
    expect(perfil.eixoAnaliticoHolistico).toBe(0);
    expect(perfil.eixoSequencialAleatorio).toBe(0);
  });

  it('confiança cresce com mais sinais aplicáveis, sem nunca passar do teto (0.7)', () => {
    const muitosSinais = Array.from({ length: 200 }, () => sinalQuiz(1000, false));
    const { confianca } = update({ atual: PERFIL_NEUTRO, sinais: muitosSinais });
    expect(confianca).toBeLessThanOrEqual(0.7);
    expect(confianca).toBeGreaterThan(0.6);
  });

  it('nunca ultrapassa os limites [-1,1] do eixo mesmo com muitos sinais', () => {
    const muitosSinais = Array.from({ length: 100 }, () => sinalQuiz(1000, false));
    const { perfil } = update({ atual: PERFIL_NEUTRO, sinais: muitosSinais });
    expect(perfil.eixoReflexivoImpulsivo).toBeLessThanOrEqual(1);
    expect(perfil.eixoReflexivoImpulsivo).toBeGreaterThanOrEqual(-1);
  });
});
