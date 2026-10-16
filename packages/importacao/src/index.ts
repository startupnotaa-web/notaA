/**
 * Importação e exportação de planilhas da Gestão Acadêmica. Puro: não fala com
 * banco nem com Storage. A API usa para a prévia, o worker para gravar — o
 * mesmo plano nos dois lados, para a tela mostrar exatamente o que será feito.
 */
export { ArquivoInvalidoError, detectarFormato } from './tipo-arquivo';
export { gerarXlsx, lerPlanilha, type Planilha } from './ler-planilha';
export {
  cabecalhoDoModelo,
  camposDoTipo,
  normalizarTexto,
  sugerirMapeamento,
  validarMapeamento,
} from './campos';
export {
  emailsDeResponsaveis,
  planejarAlunos,
  type AlunoExistente,
  type ContextoAlunos,
  type DadosAluno,
  type ItemPlanoAlunos,
  type PlanoImportacao,
  type ResponsavelExistente,
  type ResponsavelPlanejado,
} from './alunos';
export {
  planejarDisciplinas,
  type ContextoDisciplinas,
  type DadosDisciplina,
  type DisciplinaExistente,
  type ItemPlanoDisciplinas,
} from './disciplinas';
export { celulaSegura, gerarCsv } from './csv';
