import { z } from 'zod';
import { JustificativaSchema } from './academico';

// Boletim: turma × período avaliativo. O estado vive numa tabela só de inserção
// (uma linha por transição, com ator e instante). Fechado, o boletim guarda a
// regra e as médias do momento: publicado nunca recalcula sozinho.

export const EstadoBoletimSchema = z.enum(['aberto', 'fechado', 'publicado', 'retificado']);
export type EstadoBoletim = z.infer<typeof EstadoBoletimSchema>;

export const AcaoBoletimSchema = z.enum(['enviar_notas', 'fechar', 'publicar', 'retificar']);
export type AcaoBoletim = z.infer<typeof AcaoBoletimSchema>;

/** O que falta para fechar. Só ids: a tela busca os nomes. */
export const PendenciaFechamentoSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('nota_faltando'), disciplinaId: z.string().uuid(), alunoInstituicaoId: z.string().uuid() }),
  z.object({ tipo: z.literal('notas_nao_enviadas'), disciplinaId: z.string().uuid() }),
  z.object({ tipo: z.literal('notas_alteradas_apos_envio'), disciplinaId: z.string().uuid() }),
  z.object({ tipo: z.literal('disciplina_sem_aula'), disciplinaId: z.string().uuid() }),
  z.object({
    tipo: z.literal('aula_sem_registro'),
    disciplinaId: z.string().uuid(),
    aulaId: z.string().uuid(),
    alunoInstituicaoId: z.string().uuid(),
  }),
]);
export type PendenciaFechamento = z.infer<typeof PendenciaFechamentoSchema>;

export const FecharBoletimRequestSchema = z
  .object({
    /** Coordenação assume fechar mesmo com o que falta. */
    comPendencia: z.boolean().default(false),
    justificativa: JustificativaSchema.optional(),
  })
  .superRefine((b, ctx) => {
    if (b.comPendencia && b.justificativa === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['justificativa'],
        message: 'Explique por que está fechando com pendências.',
      });
    }
  });
export type FecharBoletimRequest = z.infer<typeof FecharBoletimRequestSchema>;

export const RetificarBoletimRequestSchema = z.object({ justificativa: JustificativaSchema });
export type RetificarBoletimRequest = z.infer<typeof RetificarBoletimRequestSchema>;
