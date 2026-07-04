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
  // Públicas (fluxo de auth + health check de infra)
  'GET /health': PUBLICO,
  'POST /auth/register': PUBLICO,
  'POST /auth/sync-oauth': PUBLICO,
  'POST /auth/password-reset': PUBLICO,

  // Perfil / dashboard (doc 05 §2 e §5 — "todos" os papéis autenticados)
  'GET /me': TODOS_OS_PAPEIS,
  'PATCH /me': TODOS_OS_PAPEIS,
  'GET /me/xp': TODOS_OS_PAPEIS,
  'GET /me/streak': TODOS_OS_PAPEIS,
  'POST /me/recover-streak': TODOS_OS_PAPEIS,
  'GET /me/achievements': TODOS_OS_PAPEIS,
  'GET /me/cognitive-profile': TODOS_OS_PAPEIS,
  'GET /me/dashboard': TODOS_OS_PAPEIS,

  // Onboarding (a regra "só estudante" é da camada de serviço, doc 05 §3)
  'GET /onboarding/state': TODOS_OS_PAPEIS,
  'PUT /onboarding/steps/:n': TODOS_OS_PAPEIS,
  'POST /onboarding/complete': TODOS_OS_PAPEIS,

  // Quiz adaptativo (E2)
  'POST /quiz/sessions': TODOS_OS_PAPEIS,
  'POST /quiz/generate': TODOS_OS_PAPEIS,
  'GET /quiz/sessions/:id/next-item': TODOS_OS_PAPEIS,
  'POST /quiz/sessions/:id/answers': TODOS_OS_PAPEIS,
  'POST /quiz/sessions/:id/finish': TODOS_OS_PAPEIS,

  // Redação (E7)
  'GET /redacao/history': TODOS_OS_PAPEIS,
  'POST /redacao': TODOS_OS_PAPEIS,
  'GET /redacao/:id': TODOS_OS_PAPEIS,

  // Tutor socrático (E8)
  'GET /socratic/history': TODOS_OS_PAPEIS,
  'POST /socratic/sessions': TODOS_OS_PAPEIS,
  'POST /socratic/sessions/:id/messages': TODOS_OS_PAPEIS,
  'GET /socratic/sessions/:id/messages': TODOS_OS_PAPEIS,
  'POST /socratic/chat': TODOS_OS_PAPEIS,

  // Trilhas, batalha e simulado
  'GET /study-trails/generate': TODOS_OS_PAPEIS,
  'POST /battle/matchmake': TODOS_OS_PAPEIS,
  'POST /battle/finish': TODOS_OS_PAPEIS,
  'GET /simulado/next-item': TODOS_OS_PAPEIS,
  'POST /simulado/import': ['admin'],

  // Portais Escola/Professor (doc 05 §8)
  'GET /escola/overview': ['gestor'],
  'GET /escola/turmas/:id/desempenho': ['gestor', 'professor'],
  // TODO(política): hoje sem @Roles no controller — qualquer papel autenticado
  // acessa; avaliar restringir a professor/gestor (ver auditoria R5).
  'GET /class/analytics': TODOS_OS_PAPEIS,

  // Admin
  'GET /admin/users': ['admin'],
  'GET /admin/ai-usage': ['admin'],

  // Diagnóstico de IA: consome quota do Gemini e expõe detalhes da conta —
  // restrito a admin (auditoria E3, doc 10 §7 default-deny).
  'GET /ai/test': ['admin'],
  'GET /ai/ping': ['admin'],
  'GET /ai/models': ['admin'],
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
