export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');

export const ERROR_DETECTOR_REPOSITORY = Symbol('ERROR_DETECTOR_REPOSITORY');

// Token de DI para OnboardingRepositoryPort (interfaces TS não existem em
// runtime — Nest precisa de um token concreto para resolver o provider).
export const ONBOARDING_REPOSITORY = Symbol('ONBOARDING_REPOSITORY');

export const PROFILER_REPOSITORY = Symbol('PROFILER_REPOSITORY');

export const QUIZ_REPOSITORY = Symbol('QUIZ_REPOSITORY');

// Token de DI para RedacaoRepositoryPort — redações e avaliações.
export const REDACAO_REPOSITORY = Symbol('REDACAO_REPOSITORY');

// Token de DI para SocraticRepositoryPort — conversas e mensagens do tutor.
export const SOCRATIC_REPOSITORY = Symbol('SOCRATIC_REPOSITORY');
