import { describe, expect, it } from 'vitest';
import { destinoSemPapelAposConfirmar } from './confirmacao';

describe('destinoSemPapelAposConfirmar', () => {
  it.each([
    ['https://exemplo.com'],
    ['//exemplo.com'],
    ['/\\exemplo.com'],
    ['javascript:alert(1)'],
    ['https:exemplo.com'],
    [''],
    [null],
    [undefined],
  ])('next %j cai na onboarding', (next) => {
    expect(destinoSemPapelAposConfirmar(next)).toBe('/onboarding');
  });

  it('next interno passa', () => {
    expect(destinoSemPapelAposConfirmar('/aluno')).toBe('/aluno');
    expect(destinoSemPapelAposConfirmar('/simulado?area=matematica')).toBe('/simulado?area=matematica');
  });
});
