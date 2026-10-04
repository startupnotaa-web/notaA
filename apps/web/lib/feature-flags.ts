/**
 * Interruptores de funcionalidade do app web.
 *
 * Servem para OCULTAR um módulo inteiro sem apagar nada: as páginas, os
 * componentes, os contratos e as tabelas continuam no repositório, apenas
 * deixam de ser navegáveis. Reativar é ligar a variável de ambiente.
 *
 * `arena` (batalha PvP, batalha coletiva e comunidade) está desligada porque a
 * infraestrutura de matchmaking/tempo real ainda não está pronta para o
 * público. Enquanto estiver desligada:
 *   - a aba "Arena" some da navegação (app/components/AppShell.tsx);
 *   - /arena, /batalha-coletiva e /comunidade respondem 404 (middleware.ts);
 *   - a vitrine da landing page não anuncia Batalha PvP;
 *   - a API recusa POST /battle/* (apps/api/src/common/feature-flags.ts).
 *
 * O padrão é DESLIGADO: sem a variável definida, a funcionalidade fica oculta.
 * Para religar em desenvolvimento, defina no .env do apps/web:
 *   NEXT_PUBLIC_FEATURE_ARENA=true
 * e, no ambiente da API, FEATURE_ARENA=true (as duas pontas são independentes).
 *
 * `NEXT_PUBLIC_*` é inlinado pelo Next no build, então o mesmo valor vale em
 * Server e Client Components.
 */
export const FEATURES = {
  arena: process.env.NEXT_PUBLIC_FEATURE_ARENA === 'true',
} as const;

export type Feature = keyof typeof FEATURES;

export function isFeatureEnabled(feature: Feature): boolean {
  return FEATURES[feature];
}
