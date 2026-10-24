import { quantidadeDePeriodos, type RegraAvaliativa, type SituacaoFinal } from '@notaa/contracts';

/** Ponto de partida quando a instituição ainda não tem regra: bimestral, 0 a 10, média 6, 75%. */
export const REGRA_PADRAO: RegraAvaliativa = {
  regime: { tipo: 'bimestral' },
  escala: { tipo: 'numerica', maximo: 10 },
  notaPeriodo: { tipo: 'media_aritmetica' },
  mediaFinal: { pesosPorPeriodo: [1, 1, 1, 1] },
  arredondamento: { tipo: 'normal', casas: 1 },
  recuperacao: { paralela: { modo: 'maior' }, final: null },
  aprovacao: { mediaMinima: 6, frequenciaMinima: 0.75, abonaFaltaJustificada: false },
  conselhoDeClasse: { habilitado: false, margemMaxima: null },
};

export const FAIXAS_PADRAO = [
  { conceito: 'D', min: 0, max: 5, valor: 3 },
  { conceito: 'C', min: 5, max: 7, valor: 6 },
  { conceito: 'B', min: 7, max: 9, valor: 8 },
  { conceito: 'A', min: 9, max: 10, valor: 10 },
];

/** Ajusta os pesos por período quando o regime muda, mantendo os que já existiam. */
export function comRegime(regra: RegraAvaliativa, regime: RegraAvaliativa['regime']): RegraAvaliativa {
  const n = quantidadeDePeriodos(regime);
  const atuais = regra.mediaFinal.pesosPorPeriodo;
  return {
    ...regra,
    regime,
    mediaFinal: { pesosPorPeriodo: Array.from({ length: n }, (_, i) => atuais[i] ?? 1) },
  };
}

/** Em que etapa do formulário cada parte da regra é editada (para levar o erro até ela). */
export const ETAPA_DO_CAMPO: Record<keyof RegraAvaliativa, number> = {
  regime: 0,
  escala: 1,
  notaPeriodo: 2,
  mediaFinal: 3,
  arredondamento: 4,
  recuperacao: 5,
  aprovacao: 6,
  conselhoDeClasse: 7,
};

export const ETAPAS = [
  'Períodos',
  'Escala',
  'Nota do período',
  'Média final',
  'Arredondamento',
  'Recuperação',
  'Aprovação',
  'Conselho',
] as const;

export const SITUACAO: Record<SituacaoFinal, { rotulo: string; variante: 'success' | 'info' | 'warning' | 'danger' }> = {
  aprovado: { rotulo: 'Aprovado', variante: 'success' },
  aprovado_recuperacao: { rotulo: 'Aprovado na recuperação', variante: 'success' },
  aprovado_conselho: { rotulo: 'Aprovado pelo conselho', variante: 'info' },
  recuperacao: { rotulo: 'Em recuperação final', variante: 'warning' },
  reprovado_nota: { rotulo: 'Reprovado por nota', variante: 'danger' },
  reprovado_frequencia: { rotulo: 'Reprovado por frequência', variante: 'danger' },
};

/** Número com vírgula, do jeito que se digita no Brasil. */
export function formatarNota(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
