import type { Arredondamento, Escala, RegraAvaliativa } from '@notaa/contracts';
import { describe, expect, it } from 'vitest';
import {
  aplicarRecuperacao,
  arredondar,
  calcularMediaFinal,
  calcularNotaPeriodo,
  conceitoDe,
  EntradaInvalidaError,
  simularAluno,
  situacaoFinal,
} from '../index';

function regra(overrides: Partial<RegraAvaliativa> = {}): RegraAvaliativa {
  return {
    regime: { tipo: 'bimestral' },
    escala: { tipo: 'numerica', maximo: 10 },
    notaPeriodo: { tipo: 'media_aritmetica' },
    mediaFinal: { pesosPorPeriodo: [1, 1, 1, 1] },
    arredondamento: { tipo: 'normal', casas: 1 },
    recuperacao: { paralela: null, final: null },
    aprovacao: { mediaMinima: 6, frequenciaMinima: 0.75 },
    conselhoDeClasse: { habilitado: false, margemMaxima: null },
    ...overrides,
  };
}

const CONCEITOS: Escala = {
  tipo: 'conceitos',
  maximo: 10,
  faixas: [
    { conceito: 'D', min: 0, max: 5, valor: 3 },
    { conceito: 'C', min: 5, max: 7, valor: 6 },
    { conceito: 'B', min: 7, max: 9, valor: 8 },
    { conceito: 'A', min: 9, max: 10, valor: 10 },
  ],
};

describe('calcularMediaFinal', () => {
  const bimestral2233 = regra({ mediaFinal: { pesosPorPeriodo: [2, 2, 3, 3] } });
  it.each([
    [[5, 6, 7, 8], 6.7],
    [[8, 7, 6, 5], 6.3],
    [[4, 5, 6.5, 7.5], 6],
    [[9.5, 8, 7.2, 6.4], 7.6], // 7,58
    [[10, 10, 10, 10], 10],
  ])('bimestral com pesos 2-2-3-3: %j → %s', (notas, esperado) => {
    expect(calcularMediaFinal(bimestral2233, notas)).toBe(esperado);
  });

  const trimestral334 = regra({
    regime: { tipo: 'trimestral' },
    mediaFinal: { pesosPorPeriodo: [3, 3, 4] },
  });
  it.each([
    [[6, 7, 8], 7.1],
    [[5, 5, 8], 6.2],
    [[7.3, 6.8, 5.9], 6.6], // 6,59
  ])('trimestral com pesos 3-3-4: %j → %s', (notas, esperado) => {
    expect(calcularMediaFinal(trimestral334, notas)).toBe(esperado);
  });

  it('recusa quantidade de notas diferente do número de períodos', () => {
    expect(() => calcularMediaFinal(trimestral334, [6, 7])).toThrow(EntradaInvalidaError);
  });

  it('recusa nota fora da escala', () => {
    expect(() => calcularMediaFinal(bimestral2233, [6, 7, 8, 11])).toThrow(EntradaInvalidaError);
  });
});

describe('calcularNotaPeriodo', () => {
  it.each([
    ['média aritmética', regra(), [7, 8, 6], 7],
    ['média aritmética arredondada', regra(), [6.5, 7], 6.8],
    ['média ponderada 1-2', regra({ notaPeriodo: { tipo: 'media_ponderada', pesos: [1, 2] } }), [6, 9], 8],
    ['média ponderada 3-7', regra({ notaPeriodo: { tipo: 'media_ponderada', pesos: [3, 7] } }), [5, 8], 7.1],
    ['soma de pontos', regra({ notaPeriodo: { tipo: 'soma' } }), [2, 3, 2.5], 7.5],
    ['soma limitada ao máximo', regra({ notaPeriodo: { tipo: 'soma' } }), [4, 4, 4], 10],
    [
      'soma na escala 0-100',
      regra({ notaPeriodo: { tipo: 'soma' }, escala: { tipo: 'numerica', maximo: 100 } }),
      [30, 25.5, 20],
      75.5,
    ],
  ] as const)('%s', (_nome, r, notas, esperado) => {
    expect(calcularNotaPeriodo(r, [...notas])).toBe(esperado);
  });

  it('recusa média ponderada com número de notas diferente do de pesos', () => {
    const r = regra({ notaPeriodo: { tipo: 'media_ponderada', pesos: [1, 2] } });
    expect(() => calcularNotaPeriodo(r, [6, 7, 8])).toThrow(EntradaInvalidaError);
  });

  it('recusa período sem nota', () => {
    expect(() => calcularNotaPeriodo(regra(), [])).toThrow(EntradaInvalidaError);
  });
});

describe('conceitos', () => {
  const r = regra({ escala: CONCEITOS });

  it.each([
    [0, 'D'],
    [4.99, 'D'],
    [5, 'C'],
    [6.99, 'C'],
    [7, 'B'],
    [8.99, 'B'],
    [9, 'A'],
    [10, 'A'],
  ])('nota %s → conceito %s', (nota, conceito) => {
    expect(conceitoDe(CONCEITOS, nota)).toBe(conceito);
  });

  it.each([
    [['A', 'B'], 9, 'A'],
    [['C', 7.5], 6.8, 'C'],
    [['d', 'D'], 3, 'D'],
  ] as const)('lançamento %j → nota %s, conceito %s', (notas, nota, conceito) => {
    const calculada = calcularNotaPeriodo(r, [...notas]);
    expect(calculada).toBe(nota);
    expect(conceitoDe(CONCEITOS, calculada)).toBe(conceito);
  });

  it('recusa conceito que não existe na escala', () => {
    expect(() => calcularNotaPeriodo(r, ['E'])).toThrow(EntradaInvalidaError);
  });

  it('recusa conceito lançado em escala numérica', () => {
    expect(() => calcularNotaPeriodo(regra(), ['A'])).toThrow(EntradaInvalidaError);
  });

  it('escala numérica não tem conceito', () => {
    expect(conceitoDe({ tipo: 'numerica', maximo: 10 }, 7)).toBeNull();
  });
});

describe('arredondar', () => {
  const casos: [string, number, Arredondamento, number][] = [
    ['normal, 0 casas, meio sobe', 6.5, { tipo: 'normal', casas: 0 }, 7],
    ['normal, 0 casas, abaixo do meio desce', 6.49, { tipo: 'normal', casas: 0 }, 6],
    ['normal, 1 casa, meio sobe', 6.25, { tipo: 'normal', casas: 1 }, 6.3],
    ['normal, 1 casa, abaixo do meio desce', 6.24, { tipo: 'normal', casas: 1 }, 6.2],
    ['normal, 2 casas, sem erro binário (1,005)', 1.005, { tipo: 'normal', casas: 2 }, 1.01],
    ['normal, 2 casas', 6.666, { tipo: 'normal', casas: 2 }, 6.67],
    ['para cima, 0 casas', 6.1, { tipo: 'para_cima', casas: 0 }, 7],
    ['para cima, 0 casas, já inteiro', 6, { tipo: 'para_cima', casas: 0 }, 6],
    ['para cima, 1 casa', 6.21, { tipo: 'para_cima', casas: 1 }, 6.3],
    ['para cima, 1 casa, exato', 6.2, { tipo: 'para_cima', casas: 1 }, 6.2],
    ['para cima, sem erro binário (0,1 + 0,2)', 0.1 + 0.2, { tipo: 'para_cima', casas: 1 }, 0.3],
    ['para cima, 2 casas', 7.001, { tipo: 'para_cima', casas: 2 }, 7.01],
    ['meio ponto próximo, 6,2 desce', 6.2, { tipo: 'meio_ponto', modo: 'proximo' }, 6],
    ['meio ponto próximo, 6,25 empate sobe', 6.25, { tipo: 'meio_ponto', modo: 'proximo' }, 6.5],
    ['meio ponto próximo, 6,3', 6.3, { tipo: 'meio_ponto', modo: 'proximo' }, 6.5],
    ['meio ponto próximo, 6,7', 6.7, { tipo: 'meio_ponto', modo: 'proximo' }, 6.5],
    ['meio ponto próximo, 6,75 empate sobe', 6.75, { tipo: 'meio_ponto', modo: 'proximo' }, 7],
    ['meio ponto acima, 6,1', 6.1, { tipo: 'meio_ponto', modo: 'acima' }, 6.5],
    ['meio ponto acima, 6,5 fica', 6.5, { tipo: 'meio_ponto', modo: 'acima' }, 6.5],
    ['meio ponto acima, 6,6', 6.6, { tipo: 'meio_ponto', modo: 'acima' }, 7],
    ['meio ponto acima, inteiro fica', 6, { tipo: 'meio_ponto', modo: 'acima' }, 6],
  ];
  it.each(casos)('%s: %s → %s', (_nome, valor, regraArred, esperado) => {
    expect(arredondar(valor, regraArred)).toBe(esperado);
  });

  it('a regra de arredondamento vale para a média final', () => {
    const r = regra({
      regime: { tipo: 'semestral' },
      mediaFinal: { pesosPorPeriodo: [1, 1] },
      arredondamento: { tipo: 'meio_ponto', modo: 'acima' },
    });
    expect(calcularMediaFinal(r, [5.5, 6])).toBe(6); // 5,75 → 6,0
  });
});

describe('aplicarRecuperacao', () => {
  const comParalela = (modo: 'substitui' | 'maior' | 'media') =>
    regra({ recuperacao: { paralela: { modo }, final: null } });

  it.each([
    ['substitui, recuperação maior', 'substitui', 4, 7, 7],
    ['substitui, recuperação menor também substitui', 'substitui', 5, 3, 3],
    ['maior, recuperação maior', 'maior', 4, 7, 7],
    ['maior, recuperação menor mantém a original', 'maior', 5, 3, 5],
    ['média', 'media', 4, 7, 5.5],
    ['média arredondada', 'media', 4.5, 6, 5.3], // 5,25
  ] as const)('%s', (_nome, modo, nota, rec, esperado) => {
    expect(aplicarRecuperacao(comParalela(modo), nota, rec, 'paralela')).toBe(esperado);
  });

  it('recusa recuperação que a regra não tem', () => {
    expect(() => aplicarRecuperacao(regra(), 4, 7, 'final')).toThrow(EntradaInvalidaError);
  });
});

describe('situacaoFinal', () => {
  const comFinal = (
    modo: 'substitui' | 'maior' | 'media',
    mediaMinimaParaAcesso: number | null = null,
    mediaMinimaAposRecuperacao = 5,
  ) => regra({ recuperacao: { paralela: null, final: { modo, mediaMinimaParaAcesso, mediaMinimaAposRecuperacao } } });
  const comConselho = (margemMaxima: number | null) =>
    regra({ conselhoDeClasse: { habilitado: true, margemMaxima } });

  it.each([
    ['aprova na média mínima', regra(), { mediaFinal: 6, frequencia: 0.8 }, 'aprovado', null],
    ['aprova com frequência exatamente no mínimo', regra(), { mediaFinal: 7, frequencia: 0.75 }, 'aprovado', null],
    ['reprova só por frequência, mesmo com média 9', regra(), { mediaFinal: 9, frequencia: 0.74 }, 'reprovado_frequencia', null],
    ['reprova por nota sem recuperação', regra(), { mediaFinal: 5.9, frequencia: 1 }, 'reprovado_nota', null],
    ['vai para a final enquanto a nota não sai', comFinal('media'), { mediaFinal: 4, frequencia: 0.9 }, 'recuperacao', null],
    ['final que faz média aprova', comFinal('media'), { mediaFinal: 4, frequencia: 0.9, notaRecuperacaoFinal: 7 }, 'aprovado_recuperacao', 5.5],
    ['final que faz média reprova', comFinal('media'), { mediaFinal: 4, frequencia: 0.9, notaRecuperacaoFinal: 5 }, 'reprovado_nota', 4.5],
    ['final que substitui aprova', comFinal('substitui', null, 6), { mediaFinal: 4, frequencia: 0.9, notaRecuperacaoFinal: 6 }, 'aprovado_recuperacao', 6],
    ['sem direito à final abaixo do acesso', comFinal('media', 3), { mediaFinal: 2.5, frequencia: 0.9 }, 'reprovado_nota', null],
    ['frequência barra antes da final', comFinal('media'), { mediaFinal: 4, frequencia: 0.5, notaRecuperacaoFinal: 10 }, 'reprovado_frequencia', null],
    ['conselho aprova dentro da margem', comConselho(0.5), { mediaFinal: 5.6, frequencia: 0.9, decisaoConselho: 'aprovar' }, 'aprovado_conselho', null],
    ['conselho não aprova fora da margem', comConselho(0.5), { mediaFinal: 5.4, frequencia: 0.9, decisaoConselho: 'aprovar' }, 'reprovado_nota', null],
    ['conselho que mantém reprova', comConselho(0.5), { mediaFinal: 5.6, frequencia: 0.9, decisaoConselho: 'manter' }, 'reprovado_nota', null],
    ['conselho sem margem aprova qualquer nota', comConselho(null), { mediaFinal: 2, frequencia: 0.9, decisaoConselho: 'aprovar' }, 'aprovado_conselho', null],
    ['conselho não reverte frequência', comConselho(null), { mediaFinal: 5.8, frequencia: 0.7, decisaoConselho: 'aprovar' }, 'reprovado_frequencia', null],
    ['conselho desabilitado ignora a decisão', regra(), { mediaFinal: 5.8, frequencia: 0.9, decisaoConselho: 'aprovar' }, 'reprovado_nota', null],
  ] as const)('%s', (_nome, r, entrada, situacao, mediaAposRecuperacao) => {
    expect(situacaoFinal(r, entrada)).toEqual({ situacao, mediaAposRecuperacao });
  });
});

describe('simularAluno', () => {
  const r = regra({
    mediaFinal: { pesosPorPeriodo: [2, 2, 3, 3] },
    recuperacao: { paralela: { modo: 'maior' }, final: null },
  });

  it('percorre o ano com recuperação paralela', () => {
    const resultado = simularAluno(r, {
      rotulo: 'Ana',
      notasPorPeriodo: [[5, 6], [7], [8], [9]],
      recuperacaoParalela: [7, null, null, null],
      frequencia: 0.9,
    });
    // 1º bimestre: 5,5 → 7 pela paralela. Média: (14 + 14 + 24 + 27) / 10 = 7,9.
    expect(resultado).toEqual({
      rotulo: 'Ana',
      notasPeriodo: [7, 7, 8, 9],
      mediaFinal: 7.9,
      mediaAposRecuperacao: null,
      situacao: 'aprovado',
      conceito: null,
      erro: null,
    });
  });

  it('devolve o erro em vez de lançar quando a entrada não bate com a regra', () => {
    const resultado = simularAluno(r, { notasPorPeriodo: [[5], [6], [7]], frequencia: 0.9 });
    expect(resultado.erro).toMatch(/4 períodos/);
    expect(resultado.rotulo).toBeNull();
  });
});
