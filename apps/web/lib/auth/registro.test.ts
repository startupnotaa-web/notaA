import { describe, expect, it } from 'vitest';
import { classificarFalhaDeRegistro } from './registro';

describe('classificarFalhaDeRegistro', () => {
  it.each([
    [409, 'conflito'],
    [401, 'sessao'],
    [0, 'indisponivel'],
    [500, 'indisponivel'],
    [502, 'indisponivel'],
    [503, 'indisponivel'],
    [400, 'invalido'],
    [403, 'invalido'],
    [404, 'invalido'],
    [410, 'invalido'],
    [422, 'invalido'],
  ] as const)('%i → %s', (status, motivo) => {
    expect(classificarFalhaDeRegistro(status)).toBe(motivo);
  });
});
