// Contratos compartilhados entre apps/web e apps/api (doc 05), e entre
// Orquestração e Motores (doc 05 §9). Fonte única de schemas Zod e ports —
// nunca redefinir um destes tipos localmente em outro pacote/app.
export * from './common';
export * from './class/class.schemas';
export * from './errors';
export * from './auth';
export * from './jwt';
export * from './onboarding';
export * from './quiz';
export * from './perfil';
export * from './redacao';
export * from './socratic';
export * from './engines';
export * from './ports';
export * from './study-trails';
export * from './battle';
export * from './simulado';
