import { describe, expect, it } from 'vitest';
import { SIMULADO_AREAS, SIMULADO_QUESTOES_POR_AREA, SIMULADO_TOTAL_QUESTOES } from '@notaa/contracts';
import type { AreaConhecimento, DificuldadeTri } from '@notaa/contracts';
import {
  COMPOSICAO_POR_AREA,
  calcularXp,
  intercalarPorArea,
  montarPlano,
} from '../simulado.montador';

// A prova é o produto: se o plano ou o XP saírem errados, o aluno faz um
// simulado que não é um simulado. Estas regras são testadas sem banco nem IA.

describe('montarPlano', () => {
  const plano = montarPlano(SIMULADO_AREAS);

  it('produz 10 questões por área, 40 no total', () => {
    expect(plano).toHaveLength(SIMULADO_TOTAL_QUESTOES);
    for (const area of SIMULADO_AREAS) {
      expect(plano.filter((p) => p.area === area)).toHaveLength(SIMULADO_QUESTOES_POR_AREA);
    }
  });

  it('respeita a composição de dificuldade dentro de cada área', () => {
    for (const area of SIMULADO_AREAS) {
      const daArea = plano.filter((p) => p.area === area);
      expect(daArea.filter((p) => p.dificuldade === 'facil')).toHaveLength(
        COMPOSICAO_POR_AREA.facil,
      );
      expect(daArea.filter((p) => p.dificuldade === 'media')).toHaveLength(
        COMPOSICAO_POR_AREA.media,
      );
      expect(daArea.filter((p) => p.dificuldade === 'dificil')).toHaveLength(
        COMPOSICAO_POR_AREA.dificil,
      );
    }
  });

  it('mantém a composição somando exatamente as questões por área', () => {
    const soma = Object.values(COMPOSICAO_POR_AREA).reduce((a, b) => a + b, 0);
    expect(soma).toBe(SIMULADO_QUESTOES_POR_AREA);
  });
});

describe('intercalarPorArea', () => {
  it('alterna as áreas em vez de agrupar blocos', () => {
    const ordenadas = intercalarPorArea(montarPlano(SIMULADO_AREAS));
    const primeirasQuatro = ordenadas.slice(0, SIMULADO_AREAS.length).map((q) => q.area);
    expect(new Set(primeirasQuatro).size).toBe(SIMULADO_AREAS.length);
  });

  it('não perde nem duplica questões', () => {
    const entrada = montarPlano(SIMULADO_AREAS);
    const saida = intercalarPorArea(entrada);
    expect(saida).toHaveLength(entrada.length);
    for (const area of SIMULADO_AREAS) {
      expect(saida.filter((q) => q.area === area)).toHaveLength(SIMULADO_QUESTOES_POR_AREA);
    }
  });

  it('lida com áreas de tamanhos diferentes sem travar', () => {
    const desbalanceado: { area: AreaConhecimento; dificuldade: DificuldadeTri }[] = [
      { area: 'matematica', dificuldade: 'facil' },
      { area: 'matematica', dificuldade: 'media' },
      { area: 'matematica', dificuldade: 'dificil' },
      { area: 'humanas', dificuldade: 'facil' },
    ];
    expect(intercalarPorArea(desbalanceado)).toHaveLength(4);
  });

  it('sobe a dificuldade ao longo da prova em todas as áreas', () => {
    const ordenadas = intercalarPorArea(montarPlano(SIMULADO_AREAS));
    const peso: Record<DificuldadeTri, number> = { facil: 0, media: 1, dificil: 2 };
    for (const area of SIMULADO_AREAS) {
      const daArea = ordenadas.filter((q) => q.area === area).map((q) => peso[q.dificuldade]);
      const crescente = [...daArea].sort((a, b) => a - b);
      expect(daArea).toEqual(crescente);
    }
  });

  it('coloca as questões completadas pela IA na fase certa da prova', () => {
    // Cenário real do banco: matemática só tem 2 fáceis / 3 médias / 2 difíceis
    // aproveitáveis, e a IA completa 1 de cada — chegando no fim da lista.
    const doEnem: { area: AreaConhecimento; dificuldade: DificuldadeTri; origem: string }[] = [
      { area: 'matematica', dificuldade: 'facil', origem: 'enem' },
      { area: 'matematica', dificuldade: 'facil', origem: 'enem' },
      { area: 'matematica', dificuldade: 'media', origem: 'enem' },
      { area: 'matematica', dificuldade: 'media', origem: 'enem' },
      { area: 'matematica', dificuldade: 'media', origem: 'enem' },
      { area: 'matematica', dificuldade: 'dificil', origem: 'enem' },
      { area: 'matematica', dificuldade: 'dificil', origem: 'enem' },
    ];
    const daIa: typeof doEnem = [
      { area: 'matematica', dificuldade: 'facil', origem: 'ia' },
      { area: 'matematica', dificuldade: 'media', origem: 'ia' },
      { area: 'matematica', dificuldade: 'dificil', origem: 'ia' },
    ];

    const ordenadas = intercalarPorArea([...doEnem, ...daIa]);

    // A fácil da IA não pode cair no fim da prova só porque foi gerada depois.
    expect(ordenadas[0]!.dificuldade).toBe('facil');
    expect(ordenadas.at(-1)!.dificuldade).toBe('dificil');
    expect(ordenadas.findIndex((q) => q.origem === 'ia' && q.dificuldade === 'facil')).toBeLessThan(
      ordenadas.findIndex((q) => q.dificuldade === 'dificil'),
    );
  });
});

describe('calcularXp', () => {
  const total = SIMULADO_TOTAL_QUESTOES;

  it('paga mais por menos tempo — 1h vale mais que 1h30', () => {
    const umaHora = calcularXp({ acertos: 30, total, modo: 'cronometrado', limiteMinutos: 60 });
    const umaHoraEMeia = calcularXp({ acertos: 30, total, modo: 'cronometrado', limiteMinutos: 90 });
    expect(umaHora.xp).toBeGreaterThan(umaHoraEMeia.xp);
    expect(umaHora.xp).toBe(450); // 30 × 10 × 1,5
    expect(umaHoraEMeia.xp).toBe(375); // 30 × 10 × 1,25
  });

  it('no modo livre, zera o XP em 70% ou menos de acerto', () => {
    const exatamente70 = calcularXp({ acertos: 28, total, modo: 'livre', limiteMinutos: null });
    expect(exatamente70).toEqual({ xp: 0, bloqueadoPorDesempenho: true });

    const abaixo = calcularXp({ acertos: 10, total, modo: 'livre', limiteMinutos: null });
    expect(abaixo).toEqual({ xp: 0, bloqueadoPorDesempenho: true });
  });

  it('no modo livre, paga pouco acima de 70%', () => {
    const acima = calcularXp({ acertos: 29, total, modo: 'livre', limiteMinutos: null });
    expect(acima.bloqueadoPorDesempenho).toBe(false);
    expect(acima.xp).toBe(116); // 29 × 10 × 0,4
  });

  it('mantém o livre sempre abaixo do cronometrado no mesmo desempenho', () => {
    const livre = calcularXp({ acertos: 40, total, modo: 'livre', limiteMinutos: null });
    const cronometrado = calcularXp({
      acertos: 40,
      total,
      modo: 'cronometrado',
      limiteMinutos: 90,
    });
    expect(livre.xp).toBeLessThan(cronometrado.xp);
  });

  it('não paga nada por zero acerto, em nenhum modo', () => {
    expect(calcularXp({ acertos: 0, total, modo: 'cronometrado', limiteMinutos: 60 }).xp).toBe(0);
    expect(calcularXp({ acertos: 0, total, modo: 'livre', limiteMinutos: null }).xp).toBe(0);
  });
});
