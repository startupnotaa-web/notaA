import {
  FREQUENCIA_MINIMA_LEGAL,
  type AlertaFrequencia,
  type AprovacaoRegra,
  type SituacaoFrequencia,
} from '@notaa/contracts';

/**
 * Frequência: percentual de presença por disciplina e geral, e o alerta contra
 * o mínimo da regra. Puro, como o resto do motor: quem lê as aulas é a API.
 */

export interface RegistroFrequencia {
  situacao: SituacaoFrequencia;
}

export interface OpcoesFrequencia {
  /** A falta justificada conta como presença? Vem da regra congelada. */
  abonaFaltaJustificada: boolean;
}

export interface ResumoFrequencia {
  aulas: number;
  /** Só as presenças registradas. */
  presencas: number;
  faltas: number;
  faltasJustificadas: number;
  /** Presenças somadas ao abono, quando a regra abona. É o numerador do percentual. */
  presencasComputadas: number;
  /** Fração de 0 a 1. Nulo sem aulas: sem aula não há frequência, nem 100%. */
  percentual: number | null;
}

export function resumirFrequencia(
  registros: readonly RegistroFrequencia[],
  opcoes: OpcoesFrequencia,
): ResumoFrequencia {
  let presencas = 0;
  let faltas = 0;
  let faltasJustificadas = 0;
  for (const r of registros) {
    if (r.situacao === 'presente') presencas += 1;
    else if (r.situacao === 'falta') faltas += 1;
    else faltasJustificadas += 1;
  }
  const aulas = registros.length;
  const presencasComputadas = presencas + (opcoes.abonaFaltaJustificada ? faltasJustificadas : 0);
  return {
    aulas,
    presencas,
    faltas,
    faltasJustificadas,
    presencasComputadas,
    percentual: aulas === 0 ? null : presencasComputadas / aulas,
  };
}

/** Mínimo que vale de fato: o da regra, e nunca menos que o piso da LDB. */
export function frequenciaMinimaEfetiva(aprovacao: Pick<AprovacaoRegra, 'frequenciaMinima'>): number {
  return Math.max(aprovacao.frequenciaMinima, FREQUENCIA_MINIMA_LEGAL);
}

/** Distância, em pontos percentuais, a partir da qual o alerta de proximidade acende. */
const MARGEM_ALERTA_PONTOS = 5;

/**
 * Compara em pontos-base (inteiros), não em ponto flutuante: `0,8 * 5` não é
 * garantidamente `4`, e a borda é justamente o caso que importa.
 */
const emPontosBase = (fracao: number): number => Math.round(fracao * 10_000);

export function avaliarFrequencia(
  resumo: ResumoFrequencia,
  aprovacao: Pick<AprovacaoRegra, 'frequenciaMinima'>,
): AlertaFrequencia {
  if (resumo.aulas === 0) return 'sem_aulas';
  const minimo = emPontosBase(frequenciaMinimaEfetiva(aprovacao));
  const obtido = resumo.presencasComputadas * 10_000;
  if (obtido < minimo * resumo.aulas) return 'abaixo_do_minimo';
  if (obtido <= (minimo + MARGEM_ALERTA_PONTOS * 100) * resumo.aulas) return 'proximo_do_minimo';
  return 'ok';
}

export interface ResumoPorDisciplina {
  porDisciplina: Record<string, ResumoFrequencia>;
  /** Soma das aulas de todas as disciplinas, não a média dos percentuais. */
  geral: ResumoFrequencia;
}

export function resumirPorDisciplina(
  registros: readonly (RegistroFrequencia & { disciplinaId: string })[],
  opcoes: OpcoesFrequencia,
): ResumoPorDisciplina {
  const grupos = new Map<string, RegistroFrequencia[]>();
  for (const r of registros) {
    const lista = grupos.get(r.disciplinaId) ?? [];
    lista.push(r);
    grupos.set(r.disciplinaId, lista);
  }
  const porDisciplina: Record<string, ResumoFrequencia> = {};
  for (const [id, lista] of grupos) porDisciplina[id] = resumirFrequencia(lista, opcoes);
  return { porDisciplina, geral: resumirFrequencia(registros, opcoes) };
}
