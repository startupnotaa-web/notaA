// Login por perfil: para onde cada conta vai depois de entrar, o parâmetro `next`, quem já está
// logado, rota de outro perfil, "Entrar como…" e conta inativa. Sessão e API simuladas
// (e2e/fixtures.ts): nada fala com Supabase nem com a API de verdade. O contexto de acesso é
// validado de verdade no servidor; aqui se prova o que a interface envia e como reage à recusa.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  contextoUnico,
  IDS,
  me,
  simular,
  simularLogin,
  type Papel,
  type Substituicao,
} from './fixtures';

// O service worker do app (PWA) passa a controlar a página no meio do teste e as chamadas dele não
// passam por `page.route`; sem ele as respostas simuladas valem do começo ao fim.
test.use({ serviceWorkers: 'block' });

async function entrarPeloFormulario(pagina: Page, url = '/login') {
  await pagina.goto(url);
  await pagina.getByLabel('E-mail').fill('ana@exemplo.org');
  await pagina.getByLabel('Senha').fill('senha-de-teste-123');
  await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
}

const URL_FINAL = (caminho: string) => (url: URL) => url.pathname === caminho;

test.describe('cada perfil cai na própria casa depois do login', () => {
  // `marca` prova que a moldura certa abriu: o menu lateral de cada perfil tem nome próprio.
  const CASOS: ReadonlyArray<{ nome: string; papel: Papel; destino: string; marca: (p: Page) => Locator }> = [
    { nome: 'aluno', papel: 'estudante', destino: '/dashboard', marca: (p) => p.getByRole('navigation', { name: 'Navegação principal' }) },
    { nome: 'professor institucional', papel: 'professor_institucional', destino: '/professor', marca: (p) => p.getByRole('navigation', { name: 'Painel do professor' }) },
    { nome: 'professor independente', papel: 'professor_independente', destino: '/professor', marca: (p) => p.getByRole('navigation', { name: 'Painel do professor' }) },
    { nome: 'coordenação (admin de instituição)', papel: 'admin_instituicao', destino: '/instituicao', marca: (p) => p.getByRole('navigation', { name: 'Painel da instituição' }) },
    { nome: 'responsável', papel: 'responsavel', destino: '/responsavel', marca: (p) => p.getByRole('heading', { name: 'O painel da família chega em breve' }) },
    { nome: 'admin da plataforma', papel: 'admin', destino: '/admin', marca: (p) => p.getByRole('heading', { name: /não tem painel no web/ }) },
  ];

  for (const c of CASOS) {
    test(c.nome, async ({ page }) => {
      await simularLogin(page, c.papel);
      await entrarPeloFormulario(page);
      await page.waitForURL(URL_FINAL(c.destino));
      await expect(c.marca(page)).toBeVisible();
    });
  }
});

test.describe('parâmetro next', () => {
  test('caminho do próprio perfil é respeitado', async ({ page }) => {
    await simularLogin(page, 'admin_instituicao');
    await entrarPeloFormulario(page, '/login?next=/instituicao/academico');
    await page.waitForURL(URL_FINAL('/instituicao/academico'));
  });

  test('caminho de outro perfil vai para a home do perfil', async ({ page }) => {
    await simularLogin(page, 'professor_institucional');
    await entrarPeloFormulario(page, '/login?next=/instituicao');
    await page.waitForURL(URL_FINAL('/professor'));
  });

  const MALICIOSOS = [
    '//evil.example',
    'https://evil.example/dashboard',
    '/\\evil.example',
    'javascript:alert(1)',
    '%2f%2fevil.example',
    '///evil.example',
  ];
  for (const next of MALICIOSOS) {
    test(`next malicioso ${JSON.stringify(next)} nunca sai do app`, async ({ page }) => {
      const saidas: string[] = [];
      page.on('request', (req) => {
        if (req.isNavigationRequest() && !req.url().startsWith('http://localhost')) saidas.push(req.url());
      });
      await simularLogin(page, 'professor_institucional');
      await entrarPeloFormulario(page, `/login?next=${encodeURIComponent(next)}`);
      await page.waitForURL(URL_FINAL('/professor'));
      expect(page.url()).not.toContain('evil.example');
      expect(saidas).toEqual([]);
    });
  }

  test('next malicioso também não vale no retorno do Google', async ({ page }) => {
    await simular(page, 'estudante');
    await page.goto(`/auth/destino?next=${encodeURIComponent('//evil.example')}`);
    await page.waitForURL(URL_FINAL('/onboarding'));
    expect(page.url()).not.toContain('evil.example');
  });
});

test.describe('quem já está logado e abre /login', () => {
  const CASOS: ReadonlyArray<readonly [Papel, string]> = [
    ['estudante', '/dashboard'],
    ['professor_institucional', '/professor'],
    ['admin_instituicao', '/instituicao'],
    ['responsavel', '/responsavel'],
    ['admin', '/admin'],
  ];
  for (const [papel, destino] of CASOS) {
    test(`${papel} vai direto para ${destino}`, async ({ page }) => {
      await simular(page, papel);
      await page.goto('/login');
      await page.waitForURL(URL_FINAL(destino));
    });
  }
});

test.describe('rota de outro perfil: 403 claro, sem loop', () => {
  const CASOS: ReadonlyArray<readonly [Papel, string, string]> = [
    ['professor_institucional', '/dashboard', '/professor'],
    ['professor_institucional', '/instituicao', '/professor'],
    ['admin_instituicao', '/dashboard', '/instituicao'],
    ['admin_instituicao', '/professor', '/instituicao'],
    ['estudante', '/instituicao', '/dashboard'],
    ['estudante', '/professor', '/dashboard'],
    ['responsavel', '/dashboard', '/responsavel'],
    ['admin', '/dashboard', '/admin'],
  ];
  for (const [papel, rota, casa] of CASOS) {
    test(`${papel} em ${rota}`, async ({ page }) => {
      const navegacoes: string[] = [];
      page.on('framenavigated', (f) => {
        if (f === page.mainFrame()) navegacoes.push(new URL(f.url()).pathname);
      });
      await simular(page, papel);
      await page.goto(rota);
      await expect(page.getByRole('heading', { name: 'Esta área é de outro perfil' })).toBeVisible();
      // Ficou onde estava: sem redirecionamento automático, logo sem loop.
      await page.waitForTimeout(500);
      expect(new URL(page.url()).pathname).toBe(rota);
      expect(navegacoes.filter((p) => p !== rota)).toEqual([]);
      await page.getByRole('link', { name: 'Ir para o meu painel' }).click();
      await page.waitForURL(URL_FINAL(casa));
    });
  }

  test('/perfil é de todos os perfis que têm conta própria', async ({ page }) => {
    await simular(page, 'professor_independente');
    await page.goto('/perfil');
    await expect(page.getByText(/Informações pessoais/)).toBeVisible();
  });
});

test.describe('falha ao carregar o perfil não vira "aluno"', () => {
  const MEFALHA: Substituicao = (pathname) => (pathname === '/me' ? { status: 500, json: { error: { code: 'ME_LOAD_FAILED', message: 'x' } } } : undefined);

  for (const [papel, casa] of [
    ['professor_institucional', '/professor'],
    ['admin_instituicao', '/instituicao'],
  ] as const) {
    test(`${papel} com GET /me falhando continua em ${casa}`, async ({ page }) => {
      await simular(page, papel, 'light', MEFALHA);
      await page.goto(casa);
      await page.waitForTimeout(1200);
      expect(new URL(page.url()).pathname).toBe(casa);
      await expect(page.getByRole('heading', { name: 'Esta área é de outro perfil' })).toHaveCount(0);
    });
  }

  test('token sem papel mostra "não foi possível verificar", não o painel do aluno', async ({ page }) => {
    await simular(page, null);
    await page.goto('/professor');
    await expect(page.getByRole('heading', { name: 'Não foi possível verificar o seu perfil' })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/professor');
  });
});

test.describe('"Entrar como…" com mais de um acesso', () => {
  const dois = [
    { papel: 'professor_institucional', instituicaoId: IDS.instituicao, estudanteId: null, rotulo: 'Colégio Horizonte' },
    { papel: 'professor_institucional', instituicaoId: IDS.outraInstituicao, estudanteId: null, rotulo: 'Instituto Aurora' },
  ];

  interface Registro {
    cabecalhos: string[];
    posts: unknown[];
    recusar?: boolean;
  }

  function comDoisAcessos(registro: Registro): Substituicao {
    return (pathname, metodo, cabecalhos, corpo) => {
      if (pathname === '/me/contextos') return { json: { contextos: dois } };
      if (pathname === '/me/contexto' && metodo === 'POST') {
        registro.posts.push(corpo);
        return { status: 204 };
      }
      // Antes da escolha a interface pode estar com o acesso padrão (o que ela carregou primeiro);
      // o que se exige é que, DEPOIS de confirmada, toda chamada leve o acesso escolhido.
      const valor = registro.posts.length > 0 ? cabecalhos['x-contexto'] : undefined;
      if (valor) {
        registro.cabecalhos.push(valor);
        if (registro.recusar) {
          return { status: 403, json: { error: { code: 'CONTEXTO_INVALIDO', message: 'Esse acesso não está mais disponível.' } } };
        }
      }
      return undefined;
    };
  }

  test('pergunta depois do login, registra a escolha e passa a enviar o contexto', async ({ page }) => {
    const registro: Registro = { cabecalhos: [], posts: [] };
    await simularLogin(page, 'professor_institucional', { substituir: comDoisAcessos(registro) });
    await entrarPeloFormulario(page);

    await expect(page.getByRole('heading', { name: 'Entrar como…' })).toBeVisible();
    await page.getByRole('radio', { name: /Instituto Aurora/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForURL(URL_FINAL('/professor'));

    expect(registro.posts).toEqual([{ papel: 'professor_institucional', instituicaoId: IDS.outraInstituicao, estudanteId: null }]);
    await expect(page.getByRole('button', { name: /Professor · Instituto Aurora/ })).toBeVisible();
    // As chamadas seguintes carregam o contexto escolhido (o servidor revalida cada uma).
    await expect.poll(() => registro.cabecalhos.length).toBeGreaterThan(0);
    expect(new Set(registro.cabecalhos)).toEqual(new Set([`professor_institucional:${IDS.outraInstituicao}:`]));
  });

  test('troca pelo topo sem sair da conta, e a troca vai ao servidor', async ({ page }) => {
    const registro: Registro = { cabecalhos: [], posts: [] };
    await simularLogin(page, 'professor_institucional', { substituir: comDoisAcessos(registro) });
    await entrarPeloFormulario(page);
    await page.getByRole('radio', { name: /Colégio Horizonte/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForURL(URL_FINAL('/professor'));

    await page.getByRole('button', { name: /Professor · Colégio Horizonte/ }).click();
    await page.getByRole('menuitemradio', { name: 'Instituto Aurora' }).click();
    await expect(page.getByRole('button', { name: /Professor · Instituto Aurora/ })).toBeVisible();
    expect(registro.posts.at(-1)).toEqual({ papel: 'professor_institucional', instituicaoId: IDS.outraInstituicao, estudanteId: null });
    // Continua logado, na mesma conta.
    expect(new URL(page.url()).pathname).toBe('/professor');
  });

  test('lembra o último acesso: quem já está logado entra direto, sem perguntar', async ({ page }) => {
    const registro: Registro = { cabecalhos: [], posts: [] };
    await simularLogin(page, 'professor_institucional', { substituir: comDoisAcessos(registro) });
    await entrarPeloFormulario(page);
    await page.getByRole('radio', { name: /Instituto Aurora/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForURL(URL_FINAL('/professor'));

    await page.goto('/login');
    await page.waitForURL(URL_FINAL('/professor'));
    await expect(page.getByRole('heading', { name: 'Entrar como…' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Professor · Instituto Aurora/ })).toBeVisible();
  });

  test('se o servidor recusar o contexto, volta ao padrão e avisa (não confia no que o navegador lembrava)', async ({ page }) => {
    const registro: Registro = { cabecalhos: [], posts: [] };
    await simularLogin(page, 'professor_institucional', { substituir: comDoisAcessos(registro) });
    await entrarPeloFormulario(page);
    await page.getByRole('radio', { name: /Instituto Aurora/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForURL(URL_FINAL('/professor'));

    registro.recusar = true;
    await page.reload();
    await expect(page.getByText(/não está mais disponível para a sua conta/)).toBeVisible();
  });

  test('um acesso só: o seletor não aparece', async ({ page }) => {
    await simular(page, 'professor_institucional');
    await page.goto('/professor');
    await expect(page.getByText(/Suas turmas/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Trocar de acesso/ })).toHaveCount(0);
  });
});

test.describe('conta inativa', () => {
  const INATIVA: Substituicao = (pathname) =>
    pathname === '/me/contextos'
      ? { status: 403, json: { error: { code: 'CONTA_INATIVA', message: 'Sua conta está suspensa.' } } }
      : undefined;

  test('login de conta suspensa explica o que fazer e não entra', async ({ page }) => {
    await simularLogin(page, 'estudante', { substituir: INATIVA });
    await entrarPeloFormulario(page);
    await expect(page.getByText(/Sua conta está suspensa ou ainda não foi ativada/)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('erros de login dizem o que fazer, sem revelar se a conta existe', () => {
  test('senha errada', async ({ page }) => {
    await simularLogin(page, 'estudante', { senhaErrada: true });
    await entrarPeloFormulario(page);
    await expect(page.getByText('E-mail ou senha incorretos. Confira os dados e tente de novo.')).toBeVisible();
    await expect(page.getByText(/Invalid login credentials/)).toHaveCount(0);
  });
});

test('sem sessão, rota protegida leva ao login e guarda o destino', async ({ page }) => {
  await simularLogin(page, 'professor_institucional');
  await page.goto('/professor');
  await page.waitForURL(/\/login\?next=%2Fprofessor/);
  await entrarPeloFormulario(page, page.url());
  await page.waitForURL(URL_FINAL('/professor'));
});

test('fixtures: me() tem papel e contexto coerentes', () => {
  expect(me('responsavel').instituicaoId).toBeNull();
  expect(contextoUnico('admin_instituicao')[0]?.instituicaoId).toBe(IDS.instituicao);
});

test.describe('acessibilidade das telas novas (axe, WCAG A e AA)', () => {
  async function semViolacoes(page: Page, onde: string) {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`), onde).toEqual([]);
  }

  test('acesso negado, responsável, admin e "Entrar como…"', async ({ page }) => {
    await simular(page, 'professor_institucional');
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Esta área é de outro perfil' })).toBeVisible();
    await semViolacoes(page, 'acesso negado');

    await simular(page, 'responsavel');
    await page.goto('/responsavel');
    await expect(page.getByRole('heading', { name: 'O painel da família chega em breve' })).toBeVisible();
    await semViolacoes(page, 'responsável');
  });

  test('tela "Entrar como…"', async ({ page }) => {
    await simularLogin(page, 'professor_institucional', {
      substituir: (pathname) =>
        pathname === '/me/contextos'
          ? {
              json: {
                contextos: [
                  { papel: 'professor_institucional', instituicaoId: IDS.instituicao, estudanteId: null, rotulo: 'Colégio Horizonte' },
                  { papel: 'professor_institucional', instituicaoId: IDS.outraInstituicao, estudanteId: null, rotulo: 'Instituto Aurora' },
                ],
              },
            }
          : undefined,
    });
    await entrarPeloFormulario(page);
    await expect(page.getByRole('heading', { name: 'Entrar como…' })).toBeVisible();
    await semViolacoes(page, 'entrar como');
  });
});
