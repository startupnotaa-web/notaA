import type { SituacaoFrequencia } from '@notaa/contracts';
import { describe, expect, it } from 'vitest';
import {
  avaliarFrequencia,
  frequenciaMinimaEfetiva,
  resumirFrequencia,
  resumirPorDisciplina,
} from '../index';

/** Monta registros a partir de contagens: 18 presentes, 2 faltas… */
function registros(p: number, f: number, fj = 0): { situacao: SituacaoFrequencia }[] {
  return [
    ...Array.from({ length: p }, () => ({ situacao: 'presente' as const })),
    ...Array.from({ length: f }, () => ({ situacao: 'falta' as const })),
    ...Array.from({ length: fj }, () => ({ situacao: 'falta_justificada' as const })),
  ];
}

const SEM_ABONO = { abonaFaltaJustificada: false };
const COM_ABONO = { abonaFaltaJustificada: true };
const aprovacao = (frequenciaMinima: number, abonaFaltaJustificada = false) => ({
  mediaMinima: 6,
  frequenciaMinima,
  abonaFaltaJustificada,
});

describe('resumirFrequencia', () => {
  it('conta presenças, faltas e faltas justificadas', () => {
    expect(resumirFrequencia(registros(15, 3, 2), SEM_ABONO)).toEqual({
      aulas: 20,
      presencas: 15,
      faltas: 3,
      faltasJustificadas: 2,
      presencasComputadas: 15,
      percentual: 0.75,
    });
  });

  it('por padrão a falta justificada não abona', () => {
    expect(resumirFrequencia(registros(16, 0, 4), SEM_ABONO).percentual).toBe(0.8);
  });

  it('com abono, a falta justificada conta como presença no percentual', () => {
    const r = resumirFrequencia(registros(16, 0, 4), COM_ABONO);
    expect(r.percentual).toBe(1);
    expect(r.faltasJustificadas).toBe(4);
    expect(r.presencas).toBe(16);
    expect(r.presencasComputadas).toBe(20);
  });

  it('sem aulas o percentual é nulo, nunca 100%', () => {
    expect(resumirFrequencia([], SEM_ABONO)).toEqual({
      aulas: 0,
      presencas: 0,
      faltas: 0,
      faltasJustificadas: 0,
      presencasComputadas: 0,
      percentual: null,
    });
  });
});

describe('frequenciaMinimaEfetiva', () => {
  it('usa o mínimo da regra quando é maior que o da lei', () => {
    expect(frequenciaMinimaEfetiva(aprovacao(0.85))).toBe(0.85);
  });

  it('nunca fica abaixo de 75%, mesmo que a regra venha com menos', () => {
    expect(frequenciaMinimaEfetiva(aprovacao(0.6))).toBe(0.75);
  });
});

describe('avaliarFrequencia', () => {
  const regra = aprovacao(0.75);

  it.each([
    // [presentes, faltas, esperado, por quê]
    [20, 0, 'ok', '100%'],
    [17, 3, 'ok', '85%, a mais de 5 pontos do mínimo'],
    [16, 4, 'proximo_do_minimo', '80%, exatamente 5 pontos acima'],
    [16, 3, 'ok', '84,2%'],
    [15, 5, 'proximo_do_minimo', '75%, no mínimo mas colado nele'],
    [14, 6, 'abaixo_do_minimo', '70%'],
    [149, 51, 'abaixo_do_minimo', '74,5%'],
    [3, 1, 'proximo_do_minimo', '75% com 4 aulas'],
    [2, 1, 'abaixo_do_minimo', '66,7% com 3 aulas'],
  ] as const)('%i presentes e %i faltas: %s (%s)', (p, f, esperado) => {
    expect(avaliarFrequencia(resumirFrequencia(registros(p, f), SEM_ABONO), regra)).toBe(esperado);
  });

  it('sem aulas não alerta nem aprova: devolve sem_aulas', () => {
    expect(avaliarFrequencia(resumirFrequencia([], SEM_ABONO), regra)).toBe('sem_aulas');
  });

  it('acompanha um mínimo mais exigente que o da lei', () => {
    const exigente = aprovacao(0.9);
    expect(avaliarFrequencia(resumirFrequencia(registros(17, 3), SEM_ABONO), exigente)).toBe('abaixo_do_minimo'); // 85%
    expect(avaliarFrequencia(resumirFrequencia(registros(18, 2), SEM_ABONO), exigente)).toBe('proximo_do_minimo'); // 90%
    expect(avaliarFrequencia(resumirFrequencia(registros(19, 1), SEM_ABONO), exigente)).toBe('proximo_do_minimo'); // 95%
    expect(avaliarFrequencia(resumirFrequencia(registros(20, 0), SEM_ABONO), exigente)).toBe('ok');
  });

  it('com mínimo de 100% qualquer falta fica abaixo', () => {
    expect(avaliarFrequencia(resumirFrequencia(registros(19, 1), SEM_ABONO), aprovacao(1))).toBe('abaixo_do_minimo');
  });

  it('mínimo fracionário não erra na borda de ponto flutuante', () => {
    // 0,8 de 5 aulas = 4 presenças exatas; 4/5 em float é 0.8, mas 0.8*5 não precisa ser 4.
    expect(avaliarFrequencia(resumirFrequencia(registros(4, 1), SEM_ABONO), aprovacao(0.8))).toBe('proximo_do_minimo');
    expect(avaliarFrequencia(resumirFrequencia(registros(3, 2), SEM_ABONO), aprovacao(0.8))).toBe('abaixo_do_minimo');
  });
});

describe('resumirPorDisciplina', () => {
  const com = (disciplinaId: string, lista: { situacao: SituacaoFrequencia }[]) =>
    lista.map((r) => ({ ...r, disciplinaId }));

  it('separa por disciplina e soma as aulas no geral (não faz média de percentuais)', () => {
    const r = resumirPorDisciplina(
      [...com('mat', registros(10, 0)), ...com('por', registros(3, 7))],
      SEM_ABONO,
    );
    expect(r.porDisciplina['mat']!.percentual).toBe(1);
    expect(r.porDisciplina['por']!.percentual).toBe(0.3);
    // geral: 13 presenças em 20 aulas = 65%; a média dos percentuais daria 65% também aqui,
    // então o caso abaixo prova a diferença.
    expect(r.geral.percentual).toBe(0.65);
  });

  it('o geral pesa pelo número de aulas de cada disciplina', () => {
    const r = resumirPorDisciplina(
      [...com('mat', registros(1, 0)), ...com('por', registros(0, 9))],
      SEM_ABONO,
    );
    // média dos percentuais: (100% + 0%) / 2 = 50%. Geral correto: 1 em 10 = 10%.
    expect(r.geral.percentual).toBe(0.1);
  });

  it('aplica o abono em todas as disciplinas', () => {
    const r = resumirPorDisciplina(com('mat', registros(8, 0, 2)), COM_ABONO);
    expect(r.porDisciplina['mat']!.percentual).toBe(1);
    expect(r.geral.percentual).toBe(1);
  });

  it('sem registros, geral sem aulas', () => {
    const r = resumirPorDisciplina([], SEM_ABONO);
    expect(r.porDisciplina).toEqual({});
    expect(r.geral.percentual).toBeNull();
  });
});
