import { CABECALHO_CONTEXTO } from '@notaa/contracts';
import { describe, expect, it } from 'vitest';
import { CORS_OPTIONS } from '../cors';

describe('CORS', () => {
  it('permite o cabeçalho de contexto de acesso (senão o preflight derruba toda conta com 2+ acessos)', () => {
    const permitidos = CORS_OPTIONS.allowedHeaders.map((h) => h.toLowerCase());
    expect(permitidos).toContain(CABECALHO_CONTEXTO);
  });
});
