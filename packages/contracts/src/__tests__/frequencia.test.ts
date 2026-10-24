import { describe, expect, it } from 'vitest';
import { CorrigirRegistroRequestSchema, CriarAulaRequestSchema, LancarFrequenciaRequestSchema } from '../frequencia';

const ID_1 = '11111111-1111-4111-8111-111111111111';
const ID_2 = '22222222-2222-4222-8222-222222222222';

describe('CriarAulaRequestSchema', () => {
  const base = { turmaId: ID_1, disciplinaId: ID_2, periodoId: ID_1, data: '2026-03-10' };

  it('assume a primeira aula do dia', () => {
    const r = CriarAulaRequestSchema.parse(base);
    expect(r.ordemNoDia).toBe(1);
  });

  it.each(['10/03/2026', '2026-13-01', ''])('recusa a data %j', (data) => {
    expect(CriarAulaRequestSchema.safeParse({ ...base, data }).success).toBe(false);
  });

  it.each([0, 11, 1.5])('recusa a ordem %s no dia', (ordemNoDia) => {
    expect(CriarAulaRequestSchema.safeParse({ ...base, ordemNoDia }).success).toBe(false);
  });
});

describe('LancarFrequenciaRequestSchema', () => {
  it('sem exceções, todos ficam presentes', () => {
    const r = LancarFrequenciaRequestSchema.parse({});
    expect(r.padrao).toBe('presente');
    expect(r.excecoes).toEqual([]);
  });

  it('aceita falta e falta justificada com referência', () => {
    const r = LancarFrequenciaRequestSchema.safeParse({
      excecoes: [
        { alunoInstituicaoId: ID_1, situacao: 'falta' },
        { alunoInstituicaoId: ID_2, situacao: 'falta_justificada', justificativaRef: 'ATESTADO-2026-0042' },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('recusa o mesmo aluno duas vezes', () => {
    const r = LancarFrequenciaRequestSchema.safeParse({
      excecoes: [
        { alunoInstituicaoId: ID_1, situacao: 'falta' },
        { alunoInstituicaoId: ID_1, situacao: 'presente' },
      ],
    });
    expect(r.success).toBe(false);
    expect(r.success ? [] : r.error.issues.map((i) => i.message)).toContain(
      'Cada aluno pode aparecer uma vez. Remova a linha repetida.',
    );
  });

  it('recusa referência de justificativa em quem não tem falta justificada', () => {
    const r = LancarFrequenciaRequestSchema.safeParse({
      excecoes: [{ alunoInstituicaoId: ID_1, situacao: 'falta', justificativaRef: 'ATESTADO-1' }],
    });
    expect(r.success).toBe(false);
  });

  it('recusa texto livre como referência de justificativa', () => {
    const r = CorrigirRegistroRequestSchema.safeParse({
      situacao: 'falta_justificada',
      justificativaRef: 'Maria estava com febre e foi ao pediatra',
    });
    expect(r.success).toBe(false);
  });

  it('recusa situação desconhecida', () => {
    expect(CorrigirRegistroRequestSchema.safeParse({ situacao: 'atrasado' }).success).toBe(false);
  });
});
