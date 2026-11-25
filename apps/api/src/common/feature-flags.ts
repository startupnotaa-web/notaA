/**
 * Interruptores de funcionalidade da API.
 *
 * POST /battle/matchmake pode gerar questões pelo Gemini quando não encontra
 * um oponente. Com a flag desligada, a API responde 404 antes de chamar o Gemini.
 *
 * O módulo segue registrado no AppModule de propósito: as rotas continuam
 * enumeráveis pelo guard-rail de RBAC (route-roles-sync.test.ts) e nada
 * precisa ser removido de ROUTE_ROLES para ocultar a funcionalidade.
 *
 * Padrão DESLIGADO: sem a variável definida, a funcionalidade fica oculta.
 * Para religar: FEATURE_ARENA=true no ambiente da API.
 *
 * A leitura é feita a cada chamada (e não no carregamento do módulo) para que
 * testes possam ligar e desligar a flag sem reimportar nada.
 */
export type Feature = 'arena';

const VARIAVEL_DE_AMBIENTE: Record<Feature, string> = {
  arena: 'FEATURE_ARENA',
};

export function isFeatureEnabled(feature: Feature): boolean {
  return process.env[VARIAVEL_DE_AMBIENTE[feature]] === 'true';
}
