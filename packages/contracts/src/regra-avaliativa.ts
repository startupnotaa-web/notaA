import { z } from 'zod';

// Regra avaliativa da instituição (Gestão Acadêmica, Fase 1).
// É DADO, não código: a instituição monta a regra num formulário e o motor
// `@notaa/engine-grading` a interpreta. Cálculo de nota é determinístico e
// nunca passa por IA (CONTEXTO_ATUAL §4.2).
//
// A regra é versionada no banco (`regra_avaliativa`, só inserção). Mudar a
// regra = gravar uma versão nova; a anterior fica intacta para recalcular o
// passado exatamente como foi calculado.

// ─── Regime de períodos ──────────────────────────────────────────────────────

export const RegimePeriodosSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('bimestral') }),
  z.object({ tipo: z.literal('trimestral') }),
  z.object({ tipo: z.literal('semestral') }),
  z.object({
    tipo: z.literal('personalizado'),
    quantidade: z.number().int().min(1, 'Informe ao menos um período.').max(12),
  }),
]);
export type RegimePeriodos = z.infer<typeof RegimePeriodosSchema>;

/** Quantos períodos o regime tem. Fonte única, usada pelo schema e pelo motor. */
export function quantidadeDePeriodos(regime: RegimePeriodos): number {
  switch (regime.tipo) {
    case 'bimestral':
      return 4;
    case 'trimestral':
      return 3;
    case 'semestral':
      return 2;
    case 'personalizado':
      return regime.quantidade;
  }
}

// ─── Escala ──────────────────────────────────────────────────────────────────

/**
 * Faixa de conceito. Intervalo semiaberto [min, max), exceto a última faixa,
 * que fecha em `max` para incluir a nota máxima. `valor` é o número usado no
 * cálculo quando o professor lança o conceito em vez da nota.
 */
export const FaixaConceitoSchema = z
  .object({
    conceito: z.string().trim().min(1).max(20),
    min: z.number().min(0),
    max: z.number().positive(),
    valor: z.number().min(0),
  })
  .refine((f) => f.max > f.min, { message: 'O fim da faixa precisa ser maior que o início.' })
  .refine((f) => f.valor >= f.min && f.valor <= f.max, {
    message: 'O valor do conceito precisa estar dentro da faixa.',
  });
export type FaixaConceito = z.infer<typeof FaixaConceitoSchema>;

const MaximoEscalaSchema = z.union([z.literal(10), z.literal(100)]);

/** Faixas contíguas, sem repetição, cobrindo [0, maximo]. */
function validarFaixas(
  e: { maximo: number; faixas: FaixaConceito[] },
  ctx: z.RefinementCtx,
): void {
  const ordenadas = [...e.faixas].sort((a, b) => a.min - b.min);
  const nomes = new Set(e.faixas.map((f) => f.conceito.toUpperCase()));
  if (nomes.size !== e.faixas.length) {
    ctx.addIssue({ code: 'custom', path: ['faixas'], message: 'Conceitos repetidos.' });
  }
  if (ordenadas[0]!.min !== 0 || ordenadas[ordenadas.length - 1]!.max !== e.maximo) {
    ctx.addIssue({
      code: 'custom',
      path: ['faixas'],
      message: `As faixas precisam cobrir de 0 a ${e.maximo}.`,
    });
  }
  for (let i = 1; i < ordenadas.length; i++) {
    if (ordenadas[i]!.min !== ordenadas[i - 1]!.max) {
      ctx.addIssue({
        code: 'custom',
        path: ['faixas'],
        message: 'As faixas precisam ser contíguas, sem buraco nem sobreposição.',
      });
      break;
    }
  }
}

export const EscalaSchema = z
  .discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('numerica'), maximo: MaximoEscalaSchema }),
    z.object({
      tipo: z.literal('conceitos'),
      /** Escala numérica por trás dos conceitos. As faixas cobrem [0, maximo]. */
      maximo: MaximoEscalaSchema,
      faixas: z.array(FaixaConceitoSchema).min(2, 'Use ao menos dois conceitos.').max(10),
    }),
  ])
  .superRefine((e, ctx) => {
    if (e.tipo === 'conceitos') validarFaixas(e, ctx);
  });
export type Escala = z.infer<typeof EscalaSchema>;

// ─── Nota do período e média final ──────────────────────────────────────────

const PesoSchema = z.number().positive('Peso precisa ser maior que zero.').max(100);

export const NotaPeriodoRegraSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('media_aritmetica') }),
  /** Um peso por avaliação do período, na ordem em que são lançadas. */
  z.object({ tipo: z.literal('media_ponderada'), pesos: z.array(PesoSchema).min(1).max(20) }),
  /** Soma dos pontos das avaliações, limitada ao máximo da escala. */
  z.object({ tipo: z.literal('soma') }),
]);
export type NotaPeriodoRegra = z.infer<typeof NotaPeriodoRegraSchema>;

export const MediaFinalRegraSchema = z.object({
  /** Um peso por período. Pesos iguais = média aritmética. */
  pesosPorPeriodo: z.array(PesoSchema).min(1).max(12),
});
export type MediaFinalRegra = z.infer<typeof MediaFinalRegraSchema>;

// ─── Arredondamento ─────────────────────────────────────────────────────────

const CasasSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

/**
 * Aplicado à nota de cada período, à média final e ao resultado de cada
 * recuperação.
 * - `normal`: meio para cima (6,25 → 6,3 com uma casa).
 * - `para_cima`: teto na casa pedida (6,21 → 6,3).
 * - `meio_ponto`: múltiplo de 0,5. `proximo` vai ao mais próximo, empate sobe
 *   (6,25 → 6,5; 6,2 → 6,0). `acima` sobe ao próximo (6,1 → 6,5).
 */
export const ArredondamentoSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('normal'), casas: CasasSchema }),
  z.object({ tipo: z.literal('para_cima'), casas: CasasSchema }),
  z.object({ tipo: z.literal('meio_ponto'), modo: z.enum(['proximo', 'acima']) }),
]);
export type Arredondamento = z.infer<typeof ArredondamentoSchema>;

// ─── Recuperação ────────────────────────────────────────────────────────────

/**
 * Como a nota da recuperação se combina com a nota original.
 * - `substitui`: a nota da recuperação toma o lugar da original, mesmo menor.
 * - `maior`: fica a maior das duas.
 * - `media`: média aritmética das duas.
 */
export const ModoRecuperacaoSchema = z.enum(['substitui', 'maior', 'media']);
export type ModoRecuperacao = z.infer<typeof ModoRecuperacaoSchema>;

export const RecuperacaoRegraSchema = z.object({
  /** Recuperação paralela: por período, ao longo do ano. `null` = não há. */
  paralela: z.object({ modo: ModoRecuperacaoSchema }).nullable(),
  /** Recuperação final: depois da média final. `null` = não há. */
  final: z
    .object({
      modo: ModoRecuperacaoSchema,
      /** Média mínima para ter direito à final. `null` = qualquer média. */
      mediaMinimaParaAcesso: z.number().min(0).nullable(),
      mediaMinimaAposRecuperacao: z.number().min(0),
    })
    .nullable(),
});
export type RecuperacaoRegra = z.infer<typeof RecuperacaoRegraSchema>;

// ─── Aprovação e conselho ────────────────────────────────────────────────────

export const FREQUENCIA_MINIMA_LEGAL = 0.75;

export const AprovacaoRegraSchema = z.object({
  mediaMinima: z.number().min(0),
  /**
   * Fração de 0 a 1. A LDB (art. 24, VI) exige 75% de presença: a instituição
   * pode ser mais exigente, nunca menos. Reprovação por frequência não é
   * revertida por recuperação nem por conselho.
   */
  frequenciaMinima: z
    .number()
    .min(FREQUENCIA_MINIMA_LEGAL, 'A frequência mínima não pode ser menor que 75%.')
    .max(1),
});
export type AprovacaoRegra = z.infer<typeof AprovacaoRegraSchema>;

export const ConselhoDeClasseRegraSchema = z.object({
  habilitado: z.boolean(),
  /**
   * Quanto abaixo da média exigida o conselho ainda pode aprovar.
   * `null` = sem limite. Ignorado quando `habilitado` é falso.
   */
  margemMaxima: z.number().min(0).nullable(),
});
export type ConselhoDeClasseRegra = z.infer<typeof ConselhoDeClasseRegraSchema>;

// ─── Regra completa ─────────────────────────────────────────────────────────

export const RegraAvaliativaSchema = z
  .object({
    regime: RegimePeriodosSchema,
    escala: EscalaSchema,
    notaPeriodo: NotaPeriodoRegraSchema,
    mediaFinal: MediaFinalRegraSchema,
    arredondamento: ArredondamentoSchema,
    recuperacao: RecuperacaoRegraSchema,
    aprovacao: AprovacaoRegraSchema,
    conselhoDeClasse: ConselhoDeClasseRegraSchema,
  })
  .superRefine((r, ctx) => {
    const periodos = quantidadeDePeriodos(r.regime);
    if (r.mediaFinal.pesosPorPeriodo.length !== periodos) {
      ctx.addIssue({
        code: 'custom',
        path: ['mediaFinal', 'pesosPorPeriodo'],
        message: `Informe ${periodos} pesos, um por período.`,
      });
    }
    const max = r.escala.maximo;
    const acimaDoMaximo = (valor: number, path: (string | number)[]) => {
      if (valor > max) {
        ctx.addIssue({ code: 'custom', path, message: `Não pode passar de ${max}.` });
      }
    };
    acimaDoMaximo(r.aprovacao.mediaMinima, ['aprovacao', 'mediaMinima']);
    if (r.recuperacao.final) {
      acimaDoMaximo(r.recuperacao.final.mediaMinimaAposRecuperacao, [
        'recuperacao',
        'final',
        'mediaMinimaAposRecuperacao',
      ]);
      const acesso = r.recuperacao.final.mediaMinimaParaAcesso;
      if (acesso !== null && acesso >= r.aprovacao.mediaMinima) {
        ctx.addIssue({
          code: 'custom',
          path: ['recuperacao', 'final', 'mediaMinimaParaAcesso'],
          message: 'A média para ir à final precisa ser menor que a média de aprovação.',
        });
      }
    }
  });
export type RegraAvaliativa = z.infer<typeof RegraAvaliativaSchema>;

// ─── Resultado ──────────────────────────────────────────────────────────────

export const SituacaoFinalSchema = z.enum([
  'aprovado',
  'aprovado_recuperacao',
  'aprovado_conselho',
  /** Abaixo da média, com direito à final, e a nota da final ainda não saiu. */
  'recuperacao',
  'reprovado_nota',
  'reprovado_frequencia',
]);
export type SituacaoFinal = z.infer<typeof SituacaoFinalSchema>;

/** Nota lançada: número na escala, ou um conceito quando a escala é de conceitos. */
export const NotaLancadaSchema = z.union([z.number().min(0).max(100), z.string().trim().min(1).max(20)]);
export type NotaLancada = z.infer<typeof NotaLancadaSchema>;

// ─── Simulação (POST /academico/regras/simular) ─────────────────────────────

export const AlunoSimuladoSchema = z.object({
  rotulo: z.string().trim().max(40).optional(),
  /** Uma lista de notas por período, na ordem dos períodos. */
  notasPorPeriodo: z.array(z.array(NotaLancadaSchema).min(1).max(20)).min(1).max(12),
  /** Nota de recuperação paralela de cada período, ou `null` se não fez. */
  recuperacaoParalela: z.array(z.number().min(0).max(100).nullable()).max(12).optional(),
  recuperacaoFinal: z.number().min(0).max(100).nullable().optional(),
  frequencia: z.number().min(0).max(1),
  decisaoConselho: z.enum(['aprovar', 'manter']).nullable().optional(),
});
export type AlunoSimulado = z.infer<typeof AlunoSimuladoSchema>;

export const SimularRegraRequestSchema = z.object({
  regra: RegraAvaliativaSchema,
  alunos: z.array(AlunoSimuladoSchema).min(1).max(20),
});
export type SimularRegraRequest = z.infer<typeof SimularRegraRequestSchema>;

export const ResultadoSimulacaoAlunoSchema = z.object({
  rotulo: z.string().nullable(),
  notasPeriodo: z.array(z.number()),
  mediaFinal: z.number(),
  mediaAposRecuperacao: z.number().nullable(),
  situacao: SituacaoFinalSchema,
  /** Conceito da média considerada, quando a escala é de conceitos. */
  conceito: z.string().nullable(),
  /** Preenchido quando a entrada não bate com a regra (ex.: número de notas). */
  erro: z.string().nullable(),
});
export type ResultadoSimulacaoAluno = z.infer<typeof ResultadoSimulacaoAlunoSchema>;

export const SimularRegraResponseSchema = z.object({
  resultados: z.array(ResultadoSimulacaoAlunoSchema),
});
export type SimularRegraResponse = z.infer<typeof SimularRegraResponseSchema>;
