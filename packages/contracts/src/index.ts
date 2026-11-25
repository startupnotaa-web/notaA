// Contratos compartilhados entre apps/web e apps/api (doc 05), e entre
// Orquestração e Motores (doc 05 §9). Fonte única de schemas Zod e ports —
// nunca redefinir um destes tipos localmente em outro pacote/app.
export * from './common';
export * from './academico/class.schemas';
export * from './errors';
export * from './identidade/auth';
export * from './identidade/jwt';
export * from './aprendizagem/onboarding';
export * from './aprendizagem/quiz';
export * from './identidade/perfil';
export * from './aprendizagem/redacao';
export * from './aprendizagem/socratic';
export * from './engines';
export * from './ports';
export * from './aprendizagem/study-trails';
export * from './aprendizagem/battle';
export * from './aprendizagem/simulado';
export * from './academico/turma';
export * from './academico/instituicao';
export * from './academico/regra-avaliativa';
export * from './academico/academico';
export * from './academico/importacao';
export * from './identidade/responsavel';
export * from './academico/frequencia';
export * from './academico/notas';
export * from './academico/boletim';
export * from './identidade/contexto';
export * from './plataforma/lead';
export * from './identidade/contexto';
