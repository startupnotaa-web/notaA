/**
 * Importação e exportação de planilhas da Gestão Acadêmica. Puro: não fala com
 * banco nem com Storage. A API usa para a prévia, o worker para gravar — o
 * mesmo plano nos dois lados, para a tela mostrar exatamente o que será feito.
 */
export { ArquivoInvalidoError, detectarFormato } from './leitura/tipo-arquivo';
export { gerarXlsx, lerPlanilha, type Planilha } from './leitura/ler-planilha';
export {
  cabecalhoDoModelo,
  camposDoTipo,
  normalizarTexto,
  sugerirMapeamento,
  validarMapeamento,
} from './validacao/campos';
export {
  planejarAlunos,
  type AlunoExistente,
  type ContextoAlunos,
  type DadosAluno,
  type ItemPlanoAlunos,
  type PlanoImportacao,
  type ResponsavelExistente,
  type ResponsavelPlanejado,
} from './validacao/alunos';
export {
  planejarDisciplinas,
  type ContextoDisciplinas,
  type DadosDisciplina,
  type DisciplinaExistente,
  type ItemPlanoDisciplinas,
} from './validacao/disciplinas';
export { celulaSegura, gerarCsv } from './leitura/csv';
