/**
 * Interruptores de funcionalidade da API — espelho de apps/web/lib/feature-flags.ts.
 *
 * Ocultar um módulo no front não basta: a rota continuaria acessível a quem
 * montasse a requisição na mão. No caso da Arena isso tem custo real, porque
 * POST /battle/matchmake gera questões pelo Gemini quando não encontra um
 * oponente. Com a flag desligada o controller responde 404, como se a rota não
 * existisse, e nenhum token de IA é consumido.
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
