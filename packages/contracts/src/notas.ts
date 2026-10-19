import { z } from 'zod';
import { NotaLancadaSchema } from './regra-avaliativa';

// Lançamento de notas do período. O cálculo da média e da situação não mora
// aqui: vem do motor `engine-grading`, com a regra congelada no fechamento.

export const LancamentoNotaSchema = z.object({
  alunoInstituicaoId: z.string().uuid(),
  /** Uma nota por avaliação do período. Lista vazia apaga o que foi digitado. */
  notas: z.array(NotaLancadaSchema).max(12),
  recuperacaoParalela: NotaLancadaSchema.nullish(),
  /** Só no último período da regra. */
  recuperacaoFinal: NotaLancadaSchema.nullish(),
});
export type LancamentoNota = z.infer<typeof LancamentoNotaSchema>;

export const LancarNotasRequestSchema = z
  .object({ lancamentos: z.array(LancamentoNotaSchema).min(1).max(500) })
  .superRefine((b, ctx) => {
    const vistos = new Set<string>();
    for (const [i, l] of b.lancamentos.entries()) {
      if (vistos.has(l.alunoInstituicaoId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['lancamentos', i, 'alunoInstituicaoId'],
          message: 'Cada aluno pode aparecer uma vez. Remova a linha repetida.',
        });
      }
      vistos.add(l.alunoInstituicaoId);
    }
  });
export type LancarNotasRequest = z.infer<typeof LancarNotasRequestSchema>;
