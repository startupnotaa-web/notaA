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
  'professor_institucional',
  'professor_independente',
  'admin_instituicao',
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
  // Prova fechada de 40 questões. A dona da sessão é checada no serviço (o
  // papel só diz quem pode abrir uma prova, não de quem ela é).
  'POST /simulado/sessions': TODOS_OS_PAPEIS,
  'GET /simulado/sessions/:id': TODOS_OS_PAPEIS,
  'POST /simulado/sessions/:id/answers': TODOS_OS_PAPEIS,
  'POST /simulado/sessions/:id/finish': TODOS_OS_PAPEIS,
  'GET /simulado/sessions/:id/report': TODOS_OS_PAPEIS,
  'POST /simulado/import': ['admin'],

  // Painel administrativo da instituição. Agregado e por turma; nenhum
  // indicador por professor (perfis.md proíbe comparativo entre professores).
  'GET /instituicao/overview': ['admin_instituicao'],
  'GET /instituicao/alunos': ['admin_instituicao'],
  // Detalhe de turma: o professor entra, mas só nas turmas em que leciona — a
  // checagem de qual turma é do serviço, pelo EscopoService.
  'GET /instituicao/turmas/:id/desempenho': [
    'admin_instituicao',
    'professor_institucional',
    'professor_independente',
  ],
  // Painel do professor. Restrito aos dois papéis que lecionam (+ admin da
  // plataforma). Resolve o TODO da auditoria R5: antes a rota estava aberta a
  // qualquer papel autenticado aqui, e a restrição real era uma checagem à mão
  // no handler que lia um campo inexistente e barrava todo mundo.
  'GET /class/analytics': ['professor_institucional', 'professor_independente', 'admin'],
  'GET /class/turmas': ['professor_institucional', 'professor_independente', 'admin'],

  // Ano letivo — só quem é dono de turma (perfis.md)
  'GET /ano-letivo': ['admin_instituicao', 'professor_independente'],
  'POST /ano-letivo': ['admin_instituicao', 'professor_independente'],
  'PATCH /ano-letivo/:id': ['admin_instituicao', 'professor_independente'],

  // Turma, lado de quem administra. Professor institucional NÃO cria nem
  // renomeia: ele leciona no que a instituição atribuir a ele.
  'GET /turma': ['admin_instituicao', 'professor_independente'],
  'POST /turma': ['admin_instituicao', 'professor_independente'],
  'PATCH /turma/:id': ['admin_instituicao', 'professor_independente'],
  'POST /turma/:id/codigo': ['admin_instituicao', 'professor_independente'],
  'GET /turma/:id/professores': ['admin_instituicao', 'professor_independente'],
  // Vincular e desvincular professor é ato da instituição.
  'POST /turma/:id/professores': ['admin_instituicao'],
  'DELETE /turma/:id/professores/:professorId': ['admin_instituicao'],

  // Solicitações de entrada: professor da turma OU admin da instituição. Qual
  // turma cada um alcança é checado no serviço (EscopoService).
  'GET /turma/:id/solicitacoes': [
    'admin_instituicao',
    'professor_institucional',
    'professor_independente',
  ],
  'POST /turma/:id/solicitacoes/aprovar': [
    'admin_instituicao',
    'professor_institucional',
    'professor_independente',
  ],
  'POST /turma/:id/solicitacoes/recusar': [
    'admin_instituicao',
    'professor_institucional',
    'professor_independente',
  ],
  'GET /turma/:id/alunos': [
    'admin_instituicao',
    'professor_institucional',
    'professor_independente',
  ],
  'GET /turma/:id/alunos/:estudanteId': [
    'admin_instituicao',
    'professor_institucional',
    'professor_independente',
  ],
  'DELETE /turma/:id/alunos/:estudanteId': [
    'admin_instituicao',
    'professor_institucional',
    'professor_independente',
  ],

  // Quadro de professores — só o admin da instituição.
  'GET /instituicao/professores': ['admin_instituicao'],
  'DELETE /instituicao/professores/:professorId': ['admin_instituicao'],
  'GET /instituicao/professores/convites': ['admin_instituicao'],
  'POST /instituicao/professores/convites': ['admin_instituicao'],
  'DELETE /instituicao/professores/convites/:conviteId': ['admin_instituicao'],

  // Convite de professor: PÚBLICO porque roda antes de a conta existir. Quem
  // autoriza é o token do convite, não o papel de quem chama.
  'GET /convite-professor/:token': PUBLICO,
  'POST /convite-professor/registrar': PUBLICO,

  // Turma, lado do aluno. Entrar em turma é opcional.
  'GET /me/turmas': ['estudante'],
  'GET /me/turmas/convite/:codigo': ['estudante'],
  'POST /me/turmas/convite': ['estudante'],

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
