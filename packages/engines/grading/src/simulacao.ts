import type {
  AlunoSimulado,
  RegraAvaliativa,
  ResultadoSimulacaoAluno,
} from '@notaa/contracts';
import { aplicarRecuperacao, calcularMediaFinal, calcularNotaPeriodo, situacaoFinal } from './calculo';
import { EntradaInvalidaError } from './erros';
import { conceitoDe } from './escala';

/**
 * Percorre o ano de um aluno de exemplo: nota de cada período, recuperação
 * paralela, média final, final e conselho. Entrada inconsistente com a regra
 * vira `erro` no resultado em vez de exceção, para o simulador da tela mostrar
 * o problema ao lado do aluno que o causou.
 */
export function simularAluno(regra: RegraAvaliativa, aluno: AlunoSimulado): ResultadoSimulacaoAluno {
  const rotulo = aluno.rotulo ?? null;
  try {
    const notasPeriodo = aluno.notasPorPeriodo.map((notas, i) => {
      const nota = calcularNotaPeriodo(regra, notas);
      const rec = aluno.recuperacaoParalela?.[i];
      if (rec === undefined || rec === null) return nota;
      return aplicarRecuperacao(regra, nota, rec, 'paralela');
    });
    const mediaFinal = calcularMediaFinal(regra, notasPeriodo);
    const { situacao, mediaAposRecuperacao } = situacaoFinal(regra, {
      mediaFinal,
      frequencia: aluno.frequencia,
      notaRecuperacaoFinal: aluno.recuperacaoFinal ?? null,
      decisaoConselho: aluno.decisaoConselho ?? null,
    });
    return {
      rotulo,
      notasPeriodo,
      mediaFinal,
      mediaAposRecuperacao,
      situacao,
      conceito: conceitoDe(regra.escala, mediaAposRecuperacao ?? mediaFinal),
      erro: null,
    };
  } catch (e) {
    if (!(e instanceof EntradaInvalidaError)) throw e;
    return {
      rotulo,
      notasPeriodo: [],
      mediaFinal: 0,
      mediaAposRecuperacao: null,
      situacao: 'reprovado_nota',
      conceito: null,
      erro: e.message,
    };
  }
}
