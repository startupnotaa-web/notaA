// Sessão e API simuladas para os testes de interface. Nada aqui fala com Supabase nem com
// a API de verdade: a sessão é gravada no localStorage no formato do supabase-js (sem
// verificação de assinatura no cliente) e as chamadas `fetch` do app são respondidas por
// `page.route`. Os dados são tipados pelos contratos, então um formato desatualizado
// quebra o typecheck e não só o teste.
import type { BrowserContext, Page } from '@playwright/test';
import type {
  AlunoDaInstituicao,
  AnoLetivo,
  ConviteProfessor,
  DashboardResponse,
  Disciplina,
  IndicadorDeTurma,
  InstituicaoOverview,
  MeResponse,
  PeriodoAvaliativo,
  ProfessorDaInstituicao,
  Turma,
} from '@notaa/contracts';

export type Papel = 'admin_instituicao' | 'professor_institucional' | 'professor_independente' | 'estudante';
export type Tema = 'light' | 'dark';

const UID = '11111111-1111-4111-8111-111111111111';
const INSTITUICAO = '22222222-2222-4222-8222-222222222222';
const ANO = '33333333-3333-4333-8333-333333333333';
const TURMA_A = '44444444-4444-4444-8444-444444444441';
const TURMA_B = '44444444-4444-4444-8444-444444444442';
const uuid = (n: number) => `55555555-5555-4555-8555-${String(n).padStart(12, '0')}`;

export const me = (papel: Papel): MeResponse => ({
  id: UID,
  nome: 'Ana Ribeiro',
  email: 'ana@exemplo.org',
  tipoPerfil: papel,
  instituicaoId: papel === 'estudante' ? null : INSTITUICAO,
  plano: { tipo: 'instituicao', status: 'ativa' },
  gamificacao: { nivel: { atual: 3, progresso: 0.6, xpNoNivel: 60, xpParaProximoNivel: 100, naoCalibrado: false }, xpTotal: 340, ofensivaDias: 5 },
  perfilCognitivo: null,
});

const anos: AnoLetivo[] = [{ id: ANO, rotulo: '2026', dataInicio: '2026-02-02', dataFim: '2026-12-18', arquivado: false }];

const turmas: Turma[] = [
  {
    id: TURMA_A, nome: '3º ano A', anoLetivo: { id: ANO, rotulo: '2026' }, arquivada: false,
    codigoConvite: 'K7M2QX', codigoExpiraEm: '2026-12-01T00:00:00Z', quantidadeDeProfessores: 2, quantidadeDeAlunos: 32,
    solicitacoesPendentes: 2, aceitaAluno: true,
  },
  {
    id: TURMA_B, nome: '3º ano B', anoLetivo: { id: ANO, rotulo: '2026' }, arquivada: false,
    codigoConvite: null, codigoExpiraEm: null, quantidadeDeProfessores: 1, quantidadeDeAlunos: 29,
    solicitacoesPendentes: 0, aceitaAluno: true,
  },
];

const indicadores: IndicadorDeTurma[] = [
  { turmaId: TURMA_A, nome: '3º ano A', anoLetivoRotulo: '2026', alunosAtivos: 32, alunosSemAcesso7d: 4, solicitacoesPendentes: 2, mediaXp: 1240, areaMaisFragil: { area: 'matematica', mediaAcertos: 0.48 } },
  { turmaId: TURMA_B, nome: '3º ano B', anoLetivoRotulo: '2026', alunosAtivos: 29, alunosSemAcesso7d: 0, solicitacoesPendentes: 0, mediaXp: 1580, areaMaisFragil: { area: 'humanas', mediaAcertos: 0.61 } },
];

const overview: InstituicaoOverview = {
  instituicaoNome: 'Instituição Horizonte',
  totalTurmas: 2, totalProfessores: 3, totalAlunos: 61, solicitacoesPendentes: 2, mediaXp: 1405,
  areaMaisFragil: { area: 'matematica', mediaAcertos: 0.52 },
  turmas: indicadores,
};

const alunos: AlunoDaInstituicao[] = [
  { estudanteId: uuid(1), nome: 'Bruno Lima', turmas: [{ id: TURMA_A, nome: '3º ano A' }], visivelDesde: '2026-02-10T00:00:00Z', xpTotal: 980, streak: 0, risco: 'alto', motivo: 'Sem acesso há 9 dias', ultimoAcessoEm: '2026-10-05T12:00:00Z' },
  { estudanteId: uuid(2), nome: 'Carla Souza', turmas: [{ id: TURMA_A, nome: '3º ano A' }], visivelDesde: '2026-02-10T00:00:00Z', xpTotal: 1720, streak: 12, risco: 'baixo', motivo: 'Em dia', ultimoAcessoEm: '2026-10-16T12:00:00Z' },
  { estudanteId: uuid(3), nome: 'Davi Nunes', turmas: [{ id: TURMA_B, nome: '3º ano B' }], visivelDesde: '2026-02-12T00:00:00Z', xpTotal: 1310, streak: 3, risco: 'medio', motivo: 'Queda de acertos', ultimoAcessoEm: '2026-10-14T12:00:00Z' },
];

const professores: ProfessorDaInstituicao[] = [
  { professorId: uuid(10), nome: 'Marina Alves', email: 'marina@exemplo.org', quantidadeDeTurmas: 2, turmasQueFicariamSemProfessor: [] },
  { professorId: uuid(11), nome: 'Paulo Reis', email: 'paulo@exemplo.org', quantidadeDeTurmas: 1, turmasQueFicariamSemProfessor: [{ id: TURMA_B, nome: '3º ano B' }] },
];

const convites: ConviteProfessor[] = [
  { id: uuid(20), email: 'lia@exemplo.org', token: 'tok_1234567890abcdef', expiraEm: '2026-11-20T00:00:00Z', criadoEm: '2026-10-10T00:00:00Z' },
];

const periodos: PeriodoAvaliativo[] = [
  { id: uuid(30), anoLetivoId: ANO, ordem: 1, nome: '1º trimestre', dataInicio: '2026-02-02', dataFim: '2026-05-08' },
  { id: uuid(31), anoLetivoId: ANO, ordem: 2, nome: '2º trimestre', dataInicio: '2026-05-11', dataFim: '2026-08-21' },
  { id: uuid(32), anoLetivoId: ANO, ordem: 3, nome: '3º trimestre', dataInicio: '2026-08-24', dataFim: '2026-12-18' },
];

const disciplinas: Disciplina[] = [
  { id: uuid(40), nome: 'Matemática', codigo: 'MAT', areaEnem: 'matematica', arquivada: false },
  { id: uuid(41), nome: 'Língua Portuguesa', codigo: 'POR', areaEnem: 'linguagens', arquivada: false },
  { id: uuid(42), nome: 'História', codigo: null, areaEnem: 'humanas', arquivada: true },
];

const dashboard: DashboardResponse = {
  perfil: { nome: 'Ana Ribeiro', objetivoEnem: 'Medicina', onboardingConcluido: true },
  estimativaNota: { geral: 680, porArea: { matematica: 640, linguagens: 720 }, naoCalibrado: true },
  nivel: { atual: 3, xpNoNivel: 60, xpParaProximoNivel: 100, progresso: 0.6, naoCalibrado: false },
  xpTotal: 340,
  streak: { diasConsecutivos: 5, freezesDisponiveis: 1, ultimaAtividade: '2026-10-16T12:00:00Z' },
  perfilCognitivo4d: { confianca: 0.4, eixos: [] },
  theta: {},
  progresso: { redacoesEnviadas: 2, sessoesSocraticas: 4 },
};

/** Resposta por caminho. Qualquer outro caminho devolve lista vazia. */
function resposta(pathname: string): unknown {
  if (pathname === '/me/dashboard') return dashboard;
  if (pathname === '/instituicao/overview') return overview;
  if (pathname === '/instituicao/alunos') return alunos;
  if (pathname === '/instituicao/professores') return professores;
  if (pathname === '/instituicao/professores/convites') return convites;
  if (pathname === '/ano-letivo') return anos;
  if (pathname === '/turma') return turmas;
  if (pathname === '/class/turmas') return indicadores;
  if (pathname === '/academico/periodos') return periodos;
  if (pathname === '/academico/disciplinas') return disciplinas;
  return [];
}

const ehApi = (tipo: string) => tipo === 'fetch' || tipo === 'xhr';

/**
 * Grava a sessão e o tema antes de qualquer script da página e responde a API com os dados acima.
 * Aceita o contexto inteiro (vale também para abas abertas por fora, como a do Lighthouse).
 */
export async function simular(alvo: Page | BrowserContext, papel: Papel, tema: Tema = 'light') {
  const sessao = {
    access_token: 'cabecalho.corpo.assinatura', refresh_token: 'r', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: UID, aud: 'authenticated', role: 'authenticated', email: 'ana@exemplo.org', app_metadata: { papel }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  };
  await alvo.addInitScript(([s, t]) => {
    localStorage.setItem('sb-localhost-auth-token', JSON.stringify(s));
    localStorage.setItem('notaa:tema', t as string);
  }, [sessao, tema] as const);
  await alvo.route('**/*', (rota) => {
    const req = rota.request();
    if (!ehApi(req.resourceType())) return rota.continue();
    const { pathname } = new URL(req.url());
    if (pathname === '/me') return rota.fulfill({ json: me(papel) });
    return rota.fulfill({ json: resposta(pathname) });
  });
}

/**
 * Modo conta real: com E2E_BASE_URL, E2E_EMAIL e E2E_SENHA definidos, os testes entram pelo
 * formulário de login do ambiente indicado em vez de simular sessão e API. As credenciais vêm só
 * do ambiente da pessoa que roda (nunca do repositório). A conta precisa ter o papel de E2E_PAPEL
 * (padrão: admin_instituicao); as rotas de outros papéis são puladas.
 */
export const modoReal = Boolean(process.env.E2E_BASE_URL && process.env.E2E_EMAIL && process.env.E2E_SENHA);
export const papelReal = (process.env.E2E_PAPEL ?? 'admin_instituicao') as Papel;

/** Deixa o contexto autenticado como `papel`: simulado por padrão, login de verdade no modo real. */
export async function autenticar(contexto: BrowserContext, papel: Papel, tema: Tema = 'light') {
  if (!modoReal) return simular(contexto, papel, tema);
  await contexto.addInitScript((t) => localStorage.setItem('notaa:tema', t), tema);
  const pagina = await contexto.newPage();
  await pagina.goto('/login');
  await pagina.getByLabel('E-mail').fill(process.env.E2E_EMAIL ?? '');
  await pagina.getByLabel('Senha').fill(process.env.E2E_SENHA ?? '');
  await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
  await pagina.waitForURL((url) => !url.pathname.startsWith('/login'));
  await pagina.close();
}
