import {
  quantidadeDePeriodos,
  type NotaLancada,
  type RegraAvaliativa,
  type SituacaoFinal,
} from '@notaa/contracts';
import { arredondar } from './arredondamento';
import { EntradaInvalidaError } from './erros';
import { valorDaNota } from './escala';

function mediaPonderada(valores: number[], pesos: number[]): number {
  let soma = 0;
  let somaPesos = 0;
  valores.forEach((v, i) => {
    soma += v * pesos[i]!;
    somaPesos += pesos[i]!;
  });
  return soma / somaPesos;
}

/** Nota de um período a partir das avaliações lançadas nele. Já arredondada. */
export function calcularNotaPeriodo(regra: RegraAvaliativa, notas: NotaLancada[]): number {
  if (notas.length === 0) throw new EntradaInvalidaError('Período sem nenhuma nota lançada.');
  const valores = notas.map((n) => valorDaNota(regra.escala, n));
  let bruta: number;
  switch (regra.notaPeriodo.tipo) {
    case 'media_aritmetica':
      bruta = mediaPonderada(
        valores,
        valores.map(() => 1),
      );
      break;
    case 'media_ponderada': {
      const { pesos } = regra.notaPeriodo;
      if (pesos.length !== valores.length) {
        throw new EntradaInvalidaError(
          `A regra pede ${pesos.length} avaliações por período, e vieram ${valores.length}.`,
        );
      }
      bruta = mediaPonderada(valores, pesos);
      break;
    }
    case 'soma':
      bruta = Math.min(
        valores.reduce((a, b) => a + b, 0),
        regra.escala.maximo,
      );
      break;
  }
  return arredondar(bruta, regra.arredondamento);
}

/** Média final ponderada pelos pesos de cada período. Já arredondada. */
export function calcularMediaFinal(regra: RegraAvaliativa, notasPeriodo: number[]): number {
  const esperado = quantidadeDePeriodos(regra.regime);
  if (notasPeriodo.length !== esperado) {
    throw new EntradaInvalidaError(
      `A regra tem ${esperado} períodos, e vieram ${notasPeriodo.length} notas.`,
    );
  }
  notasPeriodo.forEach((n) => valorDaNota(regra.escala, n));
  return arredondar(
    mediaPonderada(notasPeriodo, regra.mediaFinal.pesosPorPeriodo),
    regra.arredondamento,
  );
}

/**
 * Combina a nota original com a da recuperação, conforme o modo configurado
 * para aquele tipo. Recusa se a regra não tem esse tipo de recuperação.
 */
export function aplicarRecuperacao(
  regra: RegraAvaliativa,
  nota: number,
  notaRecuperacao: number,
  tipo: 'paralela' | 'final',
): number {
  const config = regra.recuperacao[tipo];
  if (!config) throw new EntradaInvalidaError(`A regra não tem recuperação ${tipo}.`);
  valorDaNota(regra.escala, nota);
  valorDaNota(regra.escala, notaRecuperacao);
  let resultado: number;
  switch (config.modo) {
    case 'substitui':
      resultado = notaRecuperacao;
      break;
    case 'maior':
      resultado = Math.max(nota, notaRecuperacao);
      break;
    case 'media':
      resultado = (nota + notaRecuperacao) / 2;
      break;
  }
  return arredondar(resultado, regra.arredondamento);
}

export interface EntradaSituacaoFinal {
  mediaFinal: number;
  /** Fração de 0 a 1. */
  frequencia: number;
  notaRecuperacaoFinal?: number | null;
  decisaoConselho?: 'aprovar' | 'manter' | null;
}

export interface ResultadoSituacaoFinal {
  situacao: SituacaoFinal;
  /** Média depois da final, quando o aluno a fez. */
  mediaAposRecuperacao: number | null;
}

/**
 * Situação do aluno no fim do ano. Ordem das decisões:
 * 1. Frequência abaixo do mínimo reprova, qualquer que seja a nota. Nem
 *    recuperação nem conselho revertem (LDB art. 24, VI).
 * 2. Média final no mínimo aprova.
 * 3. Recuperação final, se a regra tem e o aluno tem direito.
 * 4. Conselho de classe, se habilitado e dentro da margem.
 */
export function situacaoFinal(
  regra: RegraAvaliativa,
  entrada: EntradaSituacaoFinal,
): ResultadoSituacaoFinal {
  if (entrada.frequencia < 0 || entrada.frequencia > 1) {
    throw new EntradaInvalidaError('Frequência precisa estar entre 0 e 1.');
  }
  if (entrada.frequencia < regra.aprovacao.frequenciaMinima) {
    return { situacao: 'reprovado_frequencia', mediaAposRecuperacao: null };
  }

  const media = arredondar(valorDaNota(regra.escala, entrada.mediaFinal), regra.arredondamento);
  if (media >= regra.aprovacao.mediaMinima) {
    return { situacao: 'aprovado', mediaAposRecuperacao: null };
  }

  let mediaConsiderada = media;
  let minimaExigida = regra.aprovacao.mediaMinima;
  let mediaAposRecuperacao: number | null = null;

  const final = regra.recuperacao.final;
  const temDireitoAFinal =
    final !== null && (final.mediaMinimaParaAcesso === null || media >= final.mediaMinimaParaAcesso);
  if (final && temDireitoAFinal) {
    const notaFinal = entrada.notaRecuperacaoFinal;
    if (notaFinal === undefined || notaFinal === null) {
      return { situacao: 'recuperacao', mediaAposRecuperacao: null };
    }
    mediaAposRecuperacao = aplicarRecuperacao(regra, media, notaFinal, 'final');
    if (mediaAposRecuperacao >= final.mediaMinimaAposRecuperacao) {
      return { situacao: 'aprovado_recuperacao', mediaAposRecuperacao };
    }
    mediaConsiderada = mediaAposRecuperacao;
    minimaExigida = final.mediaMinimaAposRecuperacao;
  }

  const conselho = regra.conselhoDeClasse;
  if (conselho.habilitado && entrada.decisaoConselho === 'aprovar') {
    const distancia = arredondar(minimaExigida - mediaConsiderada, { tipo: 'normal', casas: 2 });
    if (conselho.margemMaxima === null || distancia <= conselho.margemMaxima) {
      return { situacao: 'aprovado_conselho', mediaAposRecuperacao };
    }
  }

  return { situacao: 'reprovado_nota', mediaAposRecuperacao };
}
