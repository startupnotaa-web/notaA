// Páginas públicas do ecossistema: /, /aluno, /professores, /escola, /faculdade (mais /privacidade e /termos).
// Cobre o que a revisão de código não pega: CSP sem violação, o three fora do JS inicial, os fallbacks do 3D,
// os formulários de lead e o teclado. A API é simulada na rota (nenhum lead de verdade é enviado).
//
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=local NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm --filter @notaa/web build
//   pnpm --filter @notaa/web exec playwright test e2e/landing.spec.ts
import { expect, test, type Page } from '@playwright/test';

const ROTAS = [
  { rota: '/', titulo: /Nota A: um ambiente para cada papel/, h1: /Um só caminho/, canonical: '/', og: 'home' },
  { rota: '/aluno', titulo: /Nota A para alunos/, h1: /Um passo por dia/, canonical: '/aluno', og: 'aluno' },
  { rota: '/professores', titulo: /Nota A para professores/, h1: /Você dá a aula/, canonical: '/professores', og: 'professores' },
  { rota: '/escola', titulo: /Nota A para escolas/, h1: /A regra de média da sua instituição/, canonical: '/escola', og: 'escola' },
  { rota: '/faculdade', titulo: /Nota A para faculdades/, h1: /ENADE com método e evidência/, canonical: '/faculdade', og: 'faculdade' },
] as const;
const COM_CENA = ROTAS;

// O 3D usa WebGL por software (SwiftShader) no Chromium sem GPU, e só liga com mais de 4 núcleos.
const COM_GPU_FINGIDA = async (page: Page) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }));
};

/** Junta as violações de CSP e os erros de console para o teste afirmar que não houve nenhum. */
function vigiar(page: Page) {
  const problemas: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problemas.push(`console: ${m.text().slice(0, 200)}`);
  });
  page.on('pageerror', (e) => problemas.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      console.error(`CSP: ${e.violatedDirective} bloqueou ${e.blockedURI || 'inline'} (${(e.sample || '').slice(0, 60)})`),
    );
  });
  return problemas;
}

for (const { rota, titulo, h1, canonical, og } of ROTAS) {
  test.describe(rota, () => {
    test('responde 200 com título, h1, canonical, Open Graph e CSP com nonce', async ({ page }) => {
      const problemas = vigiar(page);
      const resposta = await page.goto(rota);
      expect(resposta?.status()).toBe(200);
      await expect(page).toHaveTitle(titulo);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical === '/' ? /^https?:\/\/[^/]+\/?$/ : new RegExp(`${canonical}$`));
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', new RegExp(`/og/${og}\\.png$`));
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'pt_BR');

      const csp = resposta?.headers()['content-security-policy'] ?? '';
      expect(csp).toMatch(/script-src 'self' 'nonce-[^']+'/);
      expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
      expect(csp).toContain("frame-ancestors 'none'");
      expect(resposta?.headers()['x-content-type-options']).toBe('nosniff');

      await page.waitForLoadState('networkidle');
      expect(problemas, 'violações de CSP e erros de console').toEqual([]);
    });

    test('a imagem Open Graph existe', async ({ request }) => {
      const r = await request.get(`/og/${og}.png`);
      expect(r.status()).toBe(200);
      expect(r.headers()['content-type']).toBe('image/png');
    });
  });
}

test('sitemap e robots cobrem as páginas públicas', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const caminho of ['/aluno', '/professores', '/escola', '/faculdade', '/privacidade', '/termos']) {
    expect(sitemap).toContain(`${caminho}</loc>`);
  }
  expect(sitemap).not.toContain('/dashboard');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/User-Agent: \*/i);
});

test('/professor continua sendo o painel autenticado, e a landing fica em /professores', async ({ page }) => {
  await page.goto('/professor');
  // Sem sessão, o painel redireciona para o login; a landing é outra rota.
  await page.waitForURL(/\/login/);
  const r = await page.goto('/professores');
  expect(r?.status()).toBe(200);
});

test.describe('3D: carga e fallbacks', () => {
  for (const { rota } of COM_CENA) {
    test(`${rota}: o three só chega depois do load e a cena monta`, async ({ page }) => {
      await COM_GPU_FINGIDA(page);
      let carregou = false;
      page.on('load', () => (carregou = true));
      const antesDoLoad: string[] = [];
      page.on('response', async (r) => {
        if (carregou || r.request().resourceType() !== 'script') return;
        const corpo = await r.text().catch(() => '');
        if (corpo.includes('WebGLRenderer')) antesDoLoad.push(r.url());
      });
      await page.goto(rota);
      await expect(page.locator('[data-cena]')).toHaveAttribute('data-cena', 'pronta', { timeout: 30_000 });
      expect(antesDoLoad, 'scripts com o three pedidos antes do load').toEqual([]);
      await expect(page.locator('[data-cena] canvas')).toHaveCount(1);
    });

    test(`${rota}: com movimento reduzido não há canvas e a arte estática fica`, async ({ browser }) => {
      const ctx = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await COM_GPU_FINGIDA(page);
      await page.goto(rota);
      await expect(page.locator('[data-cena]')).toHaveAttribute('data-cena', 'estatica');
      await expect(page.locator('[data-cena]')).toHaveAttribute('data-motivo', 'movimento-reduzido');
      await expect(page.locator('canvas')).toHaveCount(0);
      // Nenhuma animação em andamento: a entrada termina na hora.
      const rodando = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().duration !== 0.001).length);
      expect(rodando).toBe(0);
      await ctx.close();
    });
  }

  test('sem WebGL cai no fallback', async ({ page }) => {
    await COM_GPU_FINGIDA(page);
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, tipo: string, ...resto: unknown[]) {
        if (tipo.startsWith('webgl') || tipo === 'experimental-webgl') return null;
        return (original as (...a: unknown[]) => unknown).call(this, tipo, ...resto) as never;
      } as typeof original;
    });
    await page.goto('/aluno');
    await expect(page.locator('[data-cena]')).toHaveAttribute('data-motivo', 'sem-webgl');
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('aparelho fraco (4 núcleos ou menos) cai no fallback', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 }));
    await page.goto('/escola');
    await expect(page.locator('[data-cena]')).toHaveAttribute('data-motivo', 'aparelho-fraco');
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('a cena pausa fora da viewport e com a aba oculta', async ({ page }) => {
    await COM_GPU_FINGIDA(page);
    await page.addInitScript(() => {
      // Conta os quadros pedidos ao navegador: o loop do three usa requestAnimationFrame.
      const original = window.requestAnimationFrame.bind(window);
      (window as unknown as { __quadros: number }).__quadros = 0;
      window.requestAnimationFrame = (cb) => original((t) => ((window as unknown as { __quadros: number }).__quadros++, cb(t)));
    });
    await page.goto('/faculdade');
    await expect(page.locator('[data-cena]')).toHaveAttribute('data-cena', 'pronta', { timeout: 30_000 });
    const quadros = () => page.evaluate(() => (window as unknown as { __quadros: number }).__quadros);

    const a = await quadros();
    await page.waitForTimeout(500);
    expect((await quadros()) - a, 'rodando na viewport').toBeGreaterThan(5);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    const b = await quadros();
    await page.waitForTimeout(600);
    expect((await quadros()) - b, 'parado fora da viewport').toBeLessThanOrEqual(2);
  });
});

test.describe('formulários de lead', () => {
  test('home: erros por campo, foco no primeiro, e nada é enviado', async ({ page }) => {
    let enviou = false;
    await page.route('**/leads', (r) => ((enviou = true), r.fulfill({ status: 202, json: { ok: true } })));
    await page.goto('/#contato');
    await page.getByRole('button', { name: 'Quero conhecer' }).click();
    await expect(page.getByText('Informe seu nome.')).toBeVisible();
    await expect(page.getByText(/nome@instituicao\.com\.br/)).toBeVisible();
    await expect(page.getByText(/Marque a autorização/)).toBeVisible();
    await expect(page.getByLabel('Seu nome')).toBeFocused();
    await expect(page.getByLabel('Seu nome')).toHaveAttribute('aria-invalid', 'true');
    expect(enviou).toBe(false);
  });

  test('home: envia com consentimento, sem a isca, e anuncia o resultado', async ({ page }) => {
    let corpo: Record<string, unknown> | null = null;
    await page.route('**/leads', (r) => {
      corpo = r.request().postDataJSON();
      return r.fulfill({ status: 202, json: { ok: true } });
    });
    await page.goto('/');
    await page.getByLabel('Seu nome').fill('Marina Souza');
    await page.getByLabel('Seu e-mail').fill('marina@escola.test');
    await page.getByLabel('Eu sou').selectOption('gestor');
    await page.getByLabel(/Autorizo o Nota A/).check();
    await page.getByRole('button', { name: 'Quero conhecer' }).click();
    await expect(page.getByRole('status')).toContainText('Pedido recebido');
    await expect(page.getByRole('status')).toBeFocused();
    expect(corpo).toMatchObject({ origem: 'contato', perfil: 'gestor', consentimento: true, website: '' });
    expect(String((corpo as unknown as Record<string, unknown>).versaoPolitica)).toMatch(/rascunho/);
  });

  test('escola: o campo-isca não entra na ordem de tabulação nem no leitor de tela', async ({ page }) => {
    await page.goto('/escola');
    const isca = page.locator('input[name="website"]');
    await expect(isca).toHaveAttribute('tabindex', '-1');
    await expect(isca.locator('xpath=ancestor::div[@aria-hidden="true"]')).toHaveCount(1);
  });

  test('escola: limite de envios e falha de rede mostram o que fazer', async ({ page }) => {
    await page.goto('/escola');
    const preencher = async () => {
      await page.getByLabel('Seu nome').fill('Marina');
      await page.getByLabel('Instituição', { exact: true }).fill('Colégio X');
      await page.getByLabel('E-mail de trabalho').fill('m@colegio.test');
      await page.getByLabel(/Autorizo o Nota A/).check();
    };
    await preencher();
    await page.route('**/leads', (r) => r.fulfill({ status: 429, json: { error: { code: 'RATE_LIMITED', message: 'x' } } }));
    await page.getByRole('button', { name: 'Agendar demonstração' }).first().click();
    await expect(page.locator('form [role="alert"]')).toContainText('Muitas tentativas');

    await page.unroute('**/leads');
    await page.route('**/leads', (r) => r.abort());
    await page.getByRole('button', { name: 'Agendar demonstração' }).first().click();
    await expect(page.locator('form [role="alert"]')).toContainText('Confira sua conexão');
  });

  test('faculdade: a lista de espera não promete data', async ({ page }) => {
    await page.route('**/leads', (r) => r.fulfill({ status: 202, json: { ok: true } }));
    await page.goto('/faculdade');
    await page.getByLabel('Seu nome').fill('Rui');
    await page.getByLabel('Faculdade e curso').fill('UFX, Pedagogia');
    await page.getByLabel('E-mail institucional').fill('rui@ufx.edu.br');
    await page.getByLabel(/Autorizo o Nota A/).check();
    await page.getByRole('button', { name: 'Entrar na lista' }).click();
    await expect(page.getByRole('status')).toContainText('Ainda não há data de abertura');
  });

  test('todo formulário liga o consentimento à política de privacidade', async ({ page }) => {
    for (const rota of ['/', '/escola', '/faculdade']) {
      await page.goto(rota);
      await expect(page.getByRole('link', { name: /política de privacidade/ }).first()).toHaveAttribute('href', '/privacidade');
    }
    const r = await page.goto('/privacidade');
    expect(r?.status()).toBe(200);
    await expect(page.getByText(/ainda não passou por revisão jurídica/)).toBeVisible();
  });
});

test.describe('teclado', () => {
  test('escola: as abas de recursos trocam por Enter e anunciam o estado', async ({ page }) => {
    await page.goto('/escola');
    const importacao = page.getByRole('button', { name: 'Importação' });
    await importacao.focus();
    await page.keyboard.press('Enter');
    await expect(importacao).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'Importação' })).toContainText('CSV e XLSX');
    await expect(page.getByRole('button', { name: 'Regra de avaliação' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('faculdade: as perguntas abrem e fecham pelo teclado', async ({ page }) => {
    await page.goto('/faculdade');
    const pergunta = page.getByText('O que é o ENADE?');
    await pergunta.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/Exame Nacional de Desempenho dos Estudantes/)).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/Exame Nacional de Desempenho dos Estudantes/)).toBeHidden();
  });

  test('o primeiro foco é o atalho para o conteúdo', async ({ page }) => {
    await page.goto('/aluno');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#conteudo')).toBeVisible();
  });

  test('home: os rótulos da órbita são links reais para as quatro rotas', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('[data-ancora]').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')));
    expect(hrefs).toEqual(['/aluno', '/professores', '/escola', '/faculdade']);
  });
});
