// Sessão e API simuladas para os testes de interface. Nada aqui fala com Supabase nem com
// a API de verdade: a sessão é gravada no localStorage no formato do supabase-js (sem
// verificação de assinatura no cliente) e as chamadas `fetch` do app são respondidas por
// `page.route`. Os dados são tipados pelos contratos, então um formato desatualizado
// quebra o typecheck e não só o teste.
import type { BrowserContext, Page } from '@playwright/test';
import type {
  AlunoDaInstituicao,
  ContextoListado,
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

export type Papel =
  | 'admin_instituicao'
  | 'professor_institucional'
  | 'professor_independente'
  | 'estudante'
  | 'responsavel'
  | 'admin';
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
  instituicaoId: papel === 'estudante' || papel === 'responsavel' || papel === 'admin' ? null : INSTITUICAO,
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
  perfilCognitivo4d: {
    confianca: 0.4,
    eixos: [
      { chave: 'visual_verbal', poloA: 'Visual', poloB: 'Verbal', valor: 0, temSinal: false },
      { chave: 'analitico_holistico', poloA: 'Analítico', poloB: 'Holístico', valor: 0, temSinal: false },
      { chave: 'sequencial_aleatorio', poloA: 'Sequencial', poloB: 'Aleatório', valor: 0, temSinal: false },
      { chave: 'reflexivo_impulsivo', poloA: 'Reflexivo', poloB: 'Impulsivo', valor: -0.4, temSinal: true },
    ],
  },
  theta: {},
  progresso: { redacoesEnviadas: 2, sessoesSocraticas: 4 },
};


const ID_SESSAO = '66666666-6666-4666-8666-666666666666';
const itemId = (n: number) => `77777777-7777-4777-8777-${String(n).padStart(12, '0')}`;
const alternativas = ['A', 'B', 'C', 'D', 'E'].map((id) => ({ id, texto: `Alternativa ${id} da questão de exemplo` }));
const ENUNCIADO = 'Um reservatório com formato de bloco retangular recebe água a uma vazão constante. Depois de duas horas, o nível subiu 30 cm. Quanto tempo falta para encher os 90 cm restantes?';

const conquistas = {
  desbloqueadas: [{ codigo: 'primeira_sessao', xpAssociado: 50, concedidoEm: '2026-10-01T12:00:00Z' }],
  bloqueadas: [{ codigo: 'ofensiva_7_dias', xpAssociado: 100, concedidoEm: null }],
};

const trilha = {
  id: uuid(60),
  titulo: 'Funções e gráficos em quatro passos',
  descricao: 'Uma sequência curta para firmar o que mais cai em Matemática.',
  criadoEm: '2026-10-10T12:00:00Z',
  passos: [
    { titulo: 'Leia o gráfico antes da conta', descricao: 'Identifique eixos, unidades e o ponto onde a curva muda.', dica: 'Marque os pontos que o enunciado cita.' },
    { titulo: 'Monte a função', descricao: 'Escreva a lei de formação com os dados que você já tem.' },
    { titulo: 'Teste com um valor', descricao: 'Substitua um valor simples para conferir o resultado.' },
  ],
};

const questaoPublica = (n: number) => ({
  itemId: itemId(n), ordem: n, numero: n, area: n % 2 ? 'matematica' : 'linguagens', enunciado: ENUNCIADO, alternativas, imagemUrl: null,
});

const relatorioSimulado = {
  sessaoId: ID_SESSAO, modo: 'livre', limiteMinutos: null, expirado: false, total: 40, acertos: 26, emBranco: 3,
  percentual: 65, duracaoSegundos: 5400, xpGanho: 120, xpBloqueadoPorDesempenho: false,
  porArea: [
    { chave: 'linguagens', acertos: 8, total: 10, percentual: 80 },
    { chave: 'humanas', acertos: 7, total: 10, percentual: 70 },
    { chave: 'natureza', acertos: 6, total: 10, percentual: 60 },
    { chave: 'matematica', acertos: 5, total: 10, percentual: 50 },
  ],
  porDificuldade: [
    { chave: 'facil', acertos: 12, total: 14, percentual: 86 },
    { chave: 'media', acertos: 10, total: 16, percentual: 63 },
    { chave: 'dificil', acertos: 4, total: 10, percentual: 40 },
  ],
  melhorArea: 'linguagens', areaAMelhorar: 'matematica',
  questoes: [1, 2, 3].map((n) => ({
    itemId: itemId(n), ordem: n, area: n % 2 ? 'matematica' : 'linguagens', dificuldade: 'media', origem: 'enem',
    enunciado: ENUNCIADO, alternativas, gabarito: 'C', respostaDada: n === 2 ? 'C' : 'B', acerto: n === 2,
  })),
};

/** Resposta por caminho. Qualquer outro caminho devolve lista vazia. */
function resposta(pathname: string, metodo = 'GET'): unknown {
  if (pathname === '/socratic/history' || pathname === '/redacao/history') return { historico: [] };
  if (pathname === '/socratic/sessions' && metodo === 'POST') return { conversaId: ID_SESSAO };
  if (pathname === '/me/achievements') return conquistas;
  if (pathname === '/study-trails/generate') return trilha;
  if (pathname === '/onboarding/state') return { passoAtual: 1, dados: {}, concluido: false };
  if (pathname === '/quiz/sessions' && metodo === 'POST') return { sessaoId: ID_SESSAO, primeiraQuestao: questaoPublica(1) };
  if (pathname === '/simulado/sessions' && metodo === 'POST') {
    return { sessaoId: ID_SESSAO, modo: 'livre', limiteMinutos: null, expiraEm: null, questoes: [1, 2, 3].map(questaoPublica) };
  }
  if (/^\/simulado\/sessions\/[^/]+\/answers$/.test(pathname)) return { registrada: true, respondidas: 1, total: 3 };
  if (/^\/simulado\/sessions\/[^/]+\/finish$/.test(pathname)) return relatorioSimulado;
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

export const IDS = { instituicao: INSTITUICAO, outraInstituicao: '22222222-2222-4222-8222-222222222299', uid: UID };

/** Um só acesso: o seletor "Entrar como…" fica desligado. */
export const contextoUnico = (papel: Papel): ContextoListado[] => [
  { papel, instituicaoId: papel === 'professor_institucional' || papel === 'admin_instituicao' ? INSTITUICAO : null, estudanteId: null, rotulo: 'Minha conta' },
];

/**
 * Resposta própria para um caminho da API, antes das respostas padrão. Devolver `undefined` deixa o
 * padrão valer. O terceiro argumento traz os cabeçalhos da requisição (para provar o `x-contexto`).
 */
export type Substituicao = (
  pathname: string,
  metodo: string,
  cabecalhos: Record<string, string>,
  corpo: unknown,
) => { status?: number; json?: unknown } | undefined;

function sessaoDe(papel: Papel | null) {
  return {
    access_token: 'cabecalho.corpo.assinatura', refresh_token: 'r', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: UID, aud: 'authenticated', role: 'authenticated', email: 'ana@exemplo.org',
      app_metadata: papel ? { papel } : {},
      user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
    },
  };
}

function responder(rota: import('@playwright/test').Route, papel: Papel | null, substituir?: Substituicao) {
  const req = rota.request();
  const { pathname } = new URL(req.url());
  let corpo: unknown = null;
  try {
    corpo = req.postDataJSON();
  } catch {
    corpo = null;
  }
  const s = substituir?.(pathname, req.method(), req.headers(), corpo);
  if (s) {
    if (s.status === 204) return rota.fulfill({ status: 204 });
    return rota.fulfill({ status: s.status ?? 200, json: s.json ?? {} });
  }
  if (pathname === '/me/contextos') return rota.fulfill({ json: { contextos: papel ? contextoUnico(papel) : [] } });
  if (pathname === '/me/contexto' && req.method() === 'POST') return rota.fulfill({ status: 204 });
  if (pathname === '/me' && papel) return rota.fulfill({ json: me(papel) });
  return rota.fulfill({ json: resposta(pathname, req.method()) });
}

/**
 * Página SEM sessão para testar o formulário de login: o endpoint de senha do Supabase devolve a
 * sessão de `papel` (a API continua simulada). `papelNoToken: null` simula um token sem papel.
 */
export async function simularLogin(
  pagina: Page,
  papel: Papel | null,
  opcoes: { substituir?: Substituicao; tema?: Tema; senhaErrada?: boolean } = {},
) {
  await pagina.addInitScript((t) => localStorage.setItem('notaa:tema', t), opcoes.tema ?? 'light');
  await pagina.route('**/*', (rota) => {
    const req = rota.request();
    if (!ehApi(req.resourceType())) return rota.continue();
    const { pathname } = new URL(req.url());
    if (pathname.startsWith('/auth/v1/token')) {
      if (opcoes.senhaErrada) {
        return rota.fulfill({ status: 400, json: { code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' } });
      }
      return rota.fulfill({ json: sessaoDe(papel) });
    }
    if (pathname.startsWith('/auth/v1/')) return rota.fulfill({ json: sessaoDe(papel) });
    return responder(rota, papel, opcoes.substituir);
  });
}

/**
 * Grava a sessão e o tema antes de qualquer script da página e responde a API com os dados acima.
 * Aceita o contexto inteiro (vale também para abas abertas por fora, como a do Lighthouse).
 */
export async function simular(
  alvo: Page | BrowserContext,
  papel: Papel | null,
  tema: Tema = 'light',
  substituir?: Substituicao,
) {
  const sessao = sessaoDe(papel);
  await alvo.addInitScript(([s, t]) => {
    localStorage.setItem('sb-localhost-auth-token', JSON.stringify(s));
    localStorage.setItem('notaa:tema', t as string);
  }, [sessao, tema] as const);
  await alvo.route('**/*', (rota) => {
    const req = rota.request();
    if (!ehApi(req.resourceType())) return rota.continue();
    const { pathname } = new URL(req.url());
    if (pathname.startsWith('/auth/v1/')) return rota.fulfill({ json: sessao });
    return responder(rota, papel, substituir);
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
