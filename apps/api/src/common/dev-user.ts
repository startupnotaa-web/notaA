// Identidade mock usada pelo bypass de Dev Mode (header x-development-mode).
//
// IMPORTANTE: precisa ser um UUID VÁLIDO. As colunas `usuario.id`,
// `usuario.auth_uid` e `perfil_onboarding.estudante_id` (e demais FKs) são
// `uuid` no Postgres — qualquer escrita com um id não-UUID (ex.: a string antiga
// 'mock-estudante-id-dev') falha com `invalid input syntax for type uuid`,
// derrubando todo o salvamento do onboarding. O mesmo id é usado no AuthGuard
// (claim `sub`) e no adaptador de persistência (provisionamento do usuário mock),
// para que o principal injetado e a linha do banco coincidam.
export const MOCK_DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
export const MOCK_DEV_USER_EMAIL = 'dev@notaa.local';
export const MOCK_DEV_USER_NOME = 'Estudante Dev';

/**
 * Habilita o bypass de Dev Mode. FAIL-CLOSED: exige opt-in EXPLÍCITO
 * (`ENABLE_DEV_AUTH_BYPASS=true`), um ambiente que não seja produção **e**
 * estar FORA da Vercel (auditoria R4): previews da Vercel rodam com NODE_ENV
 * indefinido/development — uma flag herdada do ambiente de dev abriria a API
 * inteira num deployment público. `VERCEL=1` está presente em todo deployment
 * (production E preview), então o bypass só funciona em máquina local.
 *
 * Antes isto retornava só `NODE_ENV !== 'production'`, o que abria login SEM
 * TOKEN em qualquer ambiente não-prod para quem mandasse o header
 * `x-development-mode: true` — um bypass de autenticação fail-open. A MESMA
 * porta controla o bypass do AuthGuard e o provisionamento do usuário mock
 * (redacao/socratic/onboarding) — em lockstep.
 */
export function isDevBypassEnabled(): boolean {
  return (
    process.env.ENABLE_DEV_AUTH_BYPASS === 'true' &&
    process.env.NODE_ENV !== 'production' &&
    !process.env.VERCEL
  );
}
