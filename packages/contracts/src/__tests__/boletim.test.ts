import { describe, expect, it } from 'vitest';
import { FecharBoletimRequestSchema, RetificarBoletimRequestSchema } from '../boletim';
import { LancarNotasRequestSchema } from '../notas';

const ID_1 = '11111111-1111-4111-8111-111111111111';

describe('FecharBoletimRequestSchema', () => {
  it('fechar sem pendência não pede justificativa', () => {
    expect(FecharBoletimRequestSchema.parse({}).comPendencia).toBe(false);
  });

  it('fechar com pendência exige justificativa', () => {
    const r = FecharBoletimRequestSchema.safeParse({ comPendencia: true });
    expect(r.success).toBe(false);
    expect(r.success ? [] : r.error.issues.map((i) => i.message)).toContain(
      'Explique por que está fechando com pendências.',
    );
  });

  it('fechar com pendência aceita justificativa de 15 a 500 caracteres', () => {
    expect(FecharBoletimRequestSchema.safeParse({ comPendencia: true, justificativa: 'x'.repeat(15) }).success).toBe(true);
    expect(FecharBoletimRequestSchema.safeParse({ comPendencia: true, justificativa: 'x'.repeat(14) }).success).toBe(false);
    expect(FecharBoletimRequestSchema.safeParse({ comPendencia: true, justificativa: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('RetificarBoletimRequestSchema', () => {
  it.each([[14, false], [15, true], [500, true], [501, false]])('justificativa de %i caracteres: %s', (n, ok) => {
    expect(RetificarBoletimRequestSchema.safeParse({ justificativa: 'x'.repeat(n) }).success).toBe(ok);
  });

  it('conta a justificativa sem espaços nas pontas', () => {
    expect(RetificarBoletimRequestSchema.safeParse({ justificativa: `  ${'x'.repeat(14)}  ` }).success).toBe(false);
  });
});

describe('LancarNotasRequestSchema', () => {
  it('aceita notas numéricas e conceitos', () => {
    const r = LancarNotasRequestSchema.safeParse({
      lancamentos: [
        { alunoInstituicaoId: ID_1, notas: [7.5, 8] },
        { alunoInstituicaoId: ID_1.replace('1111', '2222'), notas: ['B'], recuperacaoParalela: 'A' },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('recusa o mesmo aluno duas vezes', () => {
    const r = LancarNotasRequestSchema.safeParse({
      lancamentos: [
        { alunoInstituicaoId: ID_1, notas: [7] },
        { alunoInstituicaoId: ID_1, notas: [8] },
      ],
    });
    expect(r.success).toBe(false);
  });

  it('recusa nota negativa', () => {
    expect(LancarNotasRequestSchema.safeParse({ lancamentos: [{ alunoInstituicaoId: ID_1, notas: [-1] }] }).success).toBe(false);
  });

  it('aceita lançamento sem notas, para limpar o que foi digitado', () => {
    expect(LancarNotasRequestSchema.safeParse({ lancamentos: [{ alunoInstituicaoId: ID_1, notas: [] }] }).success).toBe(true);
  });
});
