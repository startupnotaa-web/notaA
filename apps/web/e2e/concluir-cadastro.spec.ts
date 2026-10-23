// Conta com sessão e sem papel (o registro em `usuario` não terminou): a única tela possível é
// "Concluir cadastro". Nunca o painel do aluno. Sessão e API simuladas (e2e/fixtures.ts).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { simular, simularLogin, type Substituicao } from './fixtures';

test.use({ serviceWorkers: 'block' });

const naTela = (page: Page) => expect(page.getByRole('heading', { name: 'Concluir cadastro' })).toBeVisible();

/** Registra todas as páginas visitadas, para provar que nenhuma foi um painel. */
function visitas(page: Page): string[] {
  const caminhos: string[] = [];
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) caminhos.push(new URL(f.url()).pathname);
  });
  return caminhos;
}

const PAINEIS = ['/dashboard', '/professor', '/instituicao', '/responsavel', '/admin'];

test.describe('conta sem papel nunca vê um painel', () => {
  for (const rota of PAINEIS) {
    test(`${rota} leva a Concluir cadastro`, async ({ page }) => {
      const caminhos = visitas(page);
      await simular(page, null);
      await page.goto(rota);
      await naTela(page);
      await page.waitForTimeout(400);
      expect(new URL(page.url()).pathname).toBe('/concluir-cadastro');
      expect(new URL(page.url()).searchParams.get('next')).toBe(rota);
      expect(caminhos.filter((c) => PAINEIS.some((p) => c === p || c.startsWith(`${p}/`)) && c !== rota)).toEqual([]);
    });
  }
});

test.describe('registro automático com o tipo que a conta declarou no cadastro', () => {
  test('professor independente: conclui e vai para o painel do professor', async ({ page }) => {
    await simular(page, null, 'light', undefined, { papelApos: 'professor_independente', metadados: { tipoPerfil: 'professor_independente', nome: 'Ana' } });
    await page.goto('/concluir-cadastro');
    await page.waitForURL((u) => u.pathname === '/professor');
  });

  test('aluno: conclui e passa pelo onboarding', async ({ page }) => {
    await simular(page, null, 'light', undefined, { papelApos: 'estudante', metadados: { tipoPerfil: 'estudante' } });
    await page.goto('/concluir-cadastro');
    await page.waitForURL((u) => u.pathname === '/onboarding');
  });

  test('respeita o destino pedido se o perfil puder abri-lo', async ({ page }) => {
    await simular(page, null, 'light', undefined, { papelApos: 'professor_independente', metadados: { tipoPerfil: 'professor_independente' } });
    await page.goto('/concluir-cadastro?next=%2Fperfil');
    await page.waitForURL((u) => u.pathname === '/perfil');
  });
});

test.describe('falhas do registro', () => {
  test('e-mail já usado por outro cadastro (409): explica, não oferece painel e deixa sair', async ({ page }) => {
    const caminhos = visitas(page);
    const recusa: Substituicao = (p, m) =>
      m === 'POST' && p === '/auth/register' ? { status: 409, json: { error: { code: 'CONFLICT', message: 'x' } } } : undefined;
    await simular(page, null, 'light', recusa, { metadados: { tipoPerfil: 'estudante' } });
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Não foi possível ligar o seu cadastro' })).toBeVisible();
    await expect(page.getByText(/já tem um cadastro no Nota A/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sair da conta' })).toBeVisible();
    await expect(page.getByRole('link', { name: /painel|início|dashboard/i })).toHaveCount(0);
    expect(caminhos.at(-1)).toBe('/concluir-cadastro');
  });

  test('API fora do ar (500): "Tentar de novo" funciona quando ela volta', async ({ page }) => {
    let tentativas = 0;
    const fora: Substituicao = (p, m) => {
      if (m === 'POST' && p === '/auth/register' && tentativas++ === 0) return { status: 500, json: { error: { code: 'X', message: 'x' } } };
      return undefined;
    };
    await simular(page, null, 'light', fora, { papelApos: 'professor_independente', metadados: { tipoPerfil: 'professor_independente' } });
    await page.goto('/concluir-cadastro');
    await expect(page.getByRole('heading', { name: 'Não conseguimos concluir agora' })).toBeVisible();
    await page.getByRole('button', { name: 'Tentar de novo' }).click();
    await page.waitForURL((u) => u.pathname === '/professor');
  });

  test('convite que não vale mais: diz o que fazer', async ({ page }) => {
    const gasto: Substituicao = (p, m) =>
      m === 'POST' && p === '/convite-professor/registrar' ? { status: 410, json: { error: { code: 'GONE', message: 'x' } } } : undefined;
    await simular(page, null, 'light', gasto, { metadados: { tokenConviteProfessor: 'abc' } });
    await page.goto('/concluir-cadastro');
    await expect(page.getByRole('heading', { name: 'Este convite não pôde ser usado' })).toBeVisible();
    await expect(page.getByText(/Peça um novo link à instituição/)).toBeVisible();
  });
});

test.describe('conta que não disse o que é (Google, por exemplo)', () => {
  test('pergunta o tipo e registra como professor', async ({ page }) => {
    const corpos: unknown[] = [];
    const guarda: Substituicao = (p, m, _h, corpo) => {
      if (m === 'POST' && p === '/auth/register') corpos.push(corpo);
      return undefined;
    };
    await simular(page, null, 'light', guarda, { papelApos: 'professor_independente', metadados: { full_name: 'Ana Souza' } });
    await page.goto('/concluir-cadastro');
    await naTela(page);
    await page.getByRole('radio', { name: /Professor/ }).click();
    await page.getByRole('button', { name: 'Concluir cadastro' }).click();
    await page.waitForURL((u) => u.pathname === '/professor');
    expect(corpos).toEqual([{ nome: 'Ana Souza', email: 'ana@exemplo.org', tipoPerfil: 'professor_independente' }]);
  });

  test('instituição exige o nome e o envia', async ({ page }) => {
    const corpos: unknown[] = [];
    const guarda: Substituicao = (p, m, _h, corpo) => {
      if (m === 'POST' && p === '/auth/register') corpos.push(corpo);
      return undefined;
    };
    await simular(page, null, 'light', guarda, { papelApos: 'admin_instituicao', metadados: {} });
    await page.goto('/concluir-cadastro');
    await page.getByRole('radio', { name: /Instituição/ }).click();
    await page.getByLabel('Nome da instituição').fill('Colégio Horizonte');
    await page.getByRole('button', { name: 'Concluir cadastro' }).click();
    await page.waitForURL((u) => u.pathname === '/instituicao');
    expect(corpos).toEqual([{ nome: 'ana', email: 'ana@exemplo.org', tipoPerfil: 'instituicao', nomeInstituicao: 'Colégio Horizonte' }]);
  });

  test('login por Google sem papel cai em Concluir cadastro, nunca no dashboard', async ({ page }) => {
    const caminhos = visitas(page);
    await simularLogin(page, null);
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('ana@exemplo.org');
    await page.getByLabel('Senha').fill('senha-de-teste-123');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await naTela(page);
    expect(caminhos.some((c) => c === '/dashboard')).toBe(false);
  });

  test('acessibilidade (axe, WCAG A e AA)', async ({ page }) => {
    await simular(page, null);
    await page.goto('/concluir-cadastro');
    await naTela(page);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
  });
});
