/**
 * Motor de notas da Gestão Acadêmica — TS puro, sem framework, banco ou IA
 * (doc 03 §2/§6). Interpreta a `RegraAvaliativa` de `@notaa/contracts`.
 * Consumido pela API e pelo worker; nunca importado por apps/web (doc 09 §2):
 * o simulador da tela chama `POST /academico/regras/simular`.
 */
export { arredondar } from './arredondamento';
export { valorDaNota, conceitoDe } from './escala';
export {
  calcularNotaPeriodo,
  calcularMediaFinal,
  aplicarRecuperacao,
  situacaoFinal,
  type EntradaSituacaoFinal,
  type ResultadoSituacaoFinal,
} from './calculo';
export { simularAluno } from './simulacao';
export {
  resumirFrequencia,
  resumirPorDisciplina,
  avaliarFrequencia,
  frequenciaMinimaEfetiva,
  type RegistroFrequencia,
  type OpcoesFrequencia,
  type ResumoFrequencia,
  type ResumoPorDisciplina,
} from './frequencia';
export { EntradaInvalidaError } from './erros';
