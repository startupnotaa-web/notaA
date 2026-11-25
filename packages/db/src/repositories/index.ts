export { QuizRepositoryDb } from './aprendizagem/quiz.repository';
export { GamificacaoRepositoryDb } from './plataforma/gamificacao.repository';
export { ProfilerRepositoryDb } from './aprendizagem/profiler.repository';
export { DashboardRepositoryDb } from './aprendizagem/dashboard.repository';
export { UsuarioRepositoryDb } from './identidade/usuario.repository';
export { InstituicaoRepositoryDb } from './academico/instituicao.repository';
export { ErrorDetectorRepositoryDb } from './aprendizagem/error-detector.repository';
export { registrarAuditoria, type EntradaAuditoria } from './plataforma/auditoria.repository';
export {
  ImportacaoRepositoryDb,
  type AutorImportacao,
  type PlanoPorTipo,
  type ResultadoAplicacao,
} from './academico/importacao.repository';
export * from './plataforma/lead.repository';
