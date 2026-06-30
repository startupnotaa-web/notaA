import type { Papel } from '@notaa/contracts';

/**
 * Núcleo puro do RBAC de rota (doc 03 §9 camada 2, doc 10 §2 passo 2 — "Guards
 * barram papéis não autorizados"). Framework-agnóstico de propósito: o
 * AuthGuard/RoleGuard do passo 6 (NestJS) chama hasRole() — esta função não
 * conhece HTTP nem decorators.
 *
 * Isto NÃO é a matriz completa de RBAC do doc 10 §1 (que inclui regras de
 * escopo/propriedade como "professor só vê SUA turma" — essas são checadas na
 * camada de serviço de cada módulo, não aqui, pois dependem de dados além do
 * papel). Esta é só a barreira de ROTA: "este papel pode entrar nesta rota?".
 */

export const PUBLICO: readonly Papel[] = [];
export const TODOS_OS_PAPEIS: readonly Papel[] = [
  'estudante',
  'professor',
  'gestor',
  'responsavel',
  'admin',
];

export function hasRole(papel: Papel, permitidos: readonly Papel[]): boolean {
  return permitidos.includes(papel);
}

/**
 * Tabela rota → papéis permitidos, só para as rotas já fixadas explicitamente
 * pelo doc 05 (§2 e §8). Cada módulo novo (quiz, redação, socrática...) adiciona
 * sua própria entrada aqui conforme é implementado a partir do passo 6 — não
 * inventar permissões para rotas ainda não especificadas.
 */
export const ROUTE_ROLES: Readonly<Record<string, readonly Papel[]>> = {
  'POST /auth/register': PUBLICO,
  'POST /auth/sync-oauth': PUBLICO,
  'POST /auth/password-reset': PUBLICO,
  'GET /me': TODOS_OS_PAPEIS,
  'GET /escola/overview': ['gestor'],
  'GET /escola/turmas/:id/desempenho': ['gestor', 'professor'],
  'GET /admin/users': ['admin'],
  'GET /admin/ai-usage': ['admin'],
};

export function isRouteAllowed(routeKey: string, papel: Papel): boolean {
  const permitidos = ROUTE_ROLES[routeKey];
  if (permitidos === undefined) {
    throw new Error(
      `Rota "${routeKey}" não está em ROUTE_ROLES — adicione a entrada antes de expor a rota (default-deny, doc 10 §7).`,
    );
  }
  if (permitidos.length === 0) return true; // pública
  return hasRole(papel, permitidos);
}
