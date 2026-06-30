import { describe, expect, it } from 'vitest';
import { EssayEvaluationSchema, NotaCompetenciaSchema } from '../redacao';

function competencia(n: number, nota: number) {
  return {
    competencia: n,
    titulo: `Competência ${n}`,
    nota,
    justificativa: 'ok',
    citacoes: [],
  };
}

function evaluation(notas: number[]) {
  return {
    redacaoId: '11111111-1111-1111-1111-111111111111',
    status: 'corrigida' as const,
    rubricaVersao: 'rubrica_v1',
    motorVersao: 'corretor-2026.06',
    modeloVersao: 'llmprovider:modelo@versao',
    notaTotal: notas.reduce((a, b) => a + b, 0),
    competencias: notas.map((nota, i) => competencia(i + 1, nota)),
    feedbackGeral: { pontosFortes: [], pontosMelhoria: [], proximoPasso: 'praticar' },
    criadoEm: new Date().toISOString(),
  };
}

describe('NotaCompetenciaSchema (doc 06 §3.2 — níveis da rubrica)', () => {
  it('aceita níveis válidos da rubrica', () => {
    for (const nota of [0, 40, 80, 120, 160, 200]) {
      expect(NotaCompetenciaSchema.safeParse(nota).success).toBe(true);
    }
  });

  it('rejeita nota fora dos níveis da rubrica', () => {
    expect(NotaCompetenciaSchema.safeParse(150).success).toBe(false);
  });
});

describe('EssayEvaluationSchema (I4/I5 — doc 05 §6, doc 06 §3.3)', () => {
  it('aceita avaliação válida com exatamente 5 competências e total correto', () => {
    const result = EssayEvaluationSchema.safeParse(evaluation([160, 160, 120, 160, 160]));
    expect(result.success).toBe(true);
  });

  it('rejeita quando há menos de 5 competências (I4)', () => {
    const result = EssayEvaluationSchema.safeParse(evaluation([160, 160, 120, 160]));
    expect(result.success).toBe(false);
  });

  it('rejeita quando notaTotal não é a soma exata das 5 competências (G-R1)', () => {
    const payload = evaluation([160, 160, 120, 160, 160]);
    payload.notaTotal = 999; // divergente da soma real (760)
    const result = EssayEvaluationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
