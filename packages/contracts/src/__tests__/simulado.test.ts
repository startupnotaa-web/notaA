import { describe, expect, it } from 'vitest';
import { IDIOMAS_ESTRANGEIROS, StartSimuladoRequestSchema } from '../simulado';

describe('StartSimuladoRequestSchema: língua estrangeira', () => {
  it.each(IDIOMAS_ESTRANGEIROS)('aceita %s', (idiomaEstrangeiro) => {
    const r = StartSimuladoRequestSchema.safeParse({ modo: 'livre', idiomaEstrangeiro });
    expect(r.success).toBe(true);
  });

  it('o idioma é opcional (cliente antigo): sem ele, o servidor não serve itens de idioma', () => {
    expect(StartSimuladoRequestSchema.safeParse({ modo: 'livre' }).success).toBe(true);
  });

  it.each(['frances', 'INGLES', '', null, 1])('recusa idioma inválido %j', (idiomaEstrangeiro) => {
    expect(StartSimuladoRequestSchema.safeParse({ modo: 'livre', idiomaEstrangeiro }).success).toBe(false);
  });

  it('continua exigindo limiteMinutos no modo cronometrado', () => {
    expect(StartSimuladoRequestSchema.safeParse({ modo: 'cronometrado', idiomaEstrangeiro: 'ingles' }).success).toBe(false);
    expect(
      StartSimuladoRequestSchema.safeParse({ modo: 'cronometrado', limiteMinutos: 60, idiomaEstrangeiro: 'ingles' }).success,
    ).toBe(true);
  });
});
