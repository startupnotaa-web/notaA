import { z } from 'zod';

// Frequência por aula. A chave do aluno é o cadastro da instituição
// (`aluno_instituicao`), não a conta: aluno sem conta também tem presença.

const DataAulaSchema = z.string().date('Data inválida.');

export const SituacaoFrequenciaSchema = z.enum(['presente', 'falta', 'falta_justificada']);
export type SituacaoFrequencia = z.infer<typeof SituacaoFrequenciaSchema>;

/**
 * Referência do documento que justifica a falta (protocolo, número do atestado).
 * Não é campo de texto livre: o motivo da falta pode ser dado de saúde, e esta
 * referência circula em registros que não devem carregar dado pessoal.
 */
export const JustificativaRefSchema = z
  .string()
  .trim()
  .min(1, 'Informe a referência do documento.')
  .max(60, 'Use até 60 caracteres na referência.')
  .regex(/^[A-Za-z0-9._\-/]+$/, 'Use só letras, números, ponto, hífen e barra. Não descreva o motivo aqui.');

const MENSAGEM_REF_SO_JUSTIFICADA = 'A referência só vale para falta justificada.';

export const CriarAulaRequestSchema = z.object({
  turmaId: z.string().uuid(),
  disciplinaId: z.string().uuid(),
  periodoId: z.string().uuid(),
  data: DataAulaSchema,
  /** Para mais de uma aula da mesma disciplina no mesmo dia. */
  ordemNoDia: z.number().int().min(1).max(10).default(1),
});
export type CriarAulaRequest = z.infer<typeof CriarAulaRequestSchema>;

export const ExcecaoFrequenciaSchema = z
  .object({
    alunoInstituicaoId: z.string().uuid(),
    situacao: SituacaoFrequenciaSchema,
    justificativaRef: JustificativaRefSchema.optional(),
  })
  .refine((e) => e.justificativaRef === undefined || e.situacao === 'falta_justificada', {
    message: MENSAGEM_REF_SO_JUSTIFICADA,
    path: ['justificativaRef'],
  });
export type ExcecaoFrequencia = z.infer<typeof ExcecaoFrequenciaSchema>;

/**
 * Lançamento em lote da aula: quem não aparece em `excecoes` fica com `padrao`.
 * O padrão é presente, para o professor marcar só quem faltou.
 */
export const LancarFrequenciaRequestSchema = z
  .object({
    padrao: z.literal('presente').default('presente'),
    excecoes: z.array(ExcecaoFrequenciaSchema).max(500).default([]),
  })
  .superRefine((b, ctx) => {
    const vistos = new Set<string>();
    for (const [i, e] of b.excecoes.entries()) {
      if (vistos.has(e.alunoInstituicaoId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['excecoes', i, 'alunoInstituicaoId'],
          message: 'Cada aluno pode aparecer uma vez. Remova a linha repetida.',
        });
      }
      vistos.add(e.alunoInstituicaoId);
    }
  });
export type LancarFrequenciaRequest = z.infer<typeof LancarFrequenciaRequestSchema>;

/** Edição de um registro só, por exceção ou correção. */
export const CorrigirRegistroRequestSchema = z
  .object({
    situacao: SituacaoFrequenciaSchema,
    justificativaRef: JustificativaRefSchema.optional(),
  })
  .refine((e) => e.justificativaRef === undefined || e.situacao === 'falta_justificada', {
    message: MENSAGEM_REF_SO_JUSTIFICADA,
    path: ['justificativaRef'],
  });
export type CorrigirRegistroRequest = z.infer<typeof CorrigirRegistroRequestSchema>;

export const AlertaFrequenciaSchema = z.enum(['ok', 'proximo_do_minimo', 'abaixo_do_minimo', 'sem_aulas']);
export type AlertaFrequencia = z.infer<typeof AlertaFrequenciaSchema>;
