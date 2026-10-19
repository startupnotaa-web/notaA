// Capturas de tela para comparar antes e depois da refatoração visual. Não afirma nada: só
// grava PNGs. Roda só com E2E_SHOTS definido, contra o app compilado e com a API simulada.
//
//   E2E_SHOTS=../../design-handoff/antes-depois E2E_MOMENTO=antes pnpm --filter @notaa/web capturas
//
// Gera {E2E_SHOTS}/{E2E_MOMENTO}/{rota}-{tema}-{largura}.png nas 5 larguras e nos 2 temas.
import { expect, test, type Page } from '@playwright/test';
import { autenticar, type Papel, type Tema } from './fixtures';

const PASTA = process.env.E2E_SHOTS;
const MOMENTO = process.env.E2E_MOMENTO ?? 'antes';
// Filtro opcional por nome de captura, ex.: E2E_SO=dashboard,login
const SO = process.env.E2E_SO?.split(',').map((s) => s.trim()).filter(Boolean);

interface Captura {
  nome: string;
  rota: string;
  papel: Papel | null; // null = rota pública
  /** Texto que prova que a tela carregou com dados, não só o esqueleto. */
  espera?: string | RegExp;
  /** Passos para chegar a outro estado da mesma rota (prova em andamento, resultado…). */
  passos?: (page: Page) => Promise<void>;
}

const CAPTURAS: Captura[] = [
  { nome: 'landing', rota: '/', papel: null, espera: /Aprenda jogando/ },
  { nome: 'login', rota: '/login', papel: null },
  { nome: 'cadastro', rota: '/cadastro', papel: null },
  { nome: 'convite-professor', rota: '/convite-professor/tok_exemplo', papel: null },
  { nome: 'planos', rota: '/planos', papel: null },
  { nome: 'onboarding', rota: '/onboarding', papel: 'estudante' },
  { nome: 'dashboard', rota: '/dashboard', papel: 'estudante', espera: /XP/ },
  { nome: 'estudo', rota: '/estudo', papel: 'estudante' },
  { nome: 'trilhas', rota: '/trilhas', papel: 'estudante' },
  {
    nome: 'quiz-areas',
    rota: '/quiz',
    papel: 'estudante',
    espera: /Escolha uma área/,
  },
  {
    nome: 'quiz-questao',
    rota: '/quiz',
    papel: 'estudante',
    espera: /Escolha uma área/,
    passos: async (page) => {
      await page.getByRole('button', { name: /Matemática/ }).first().click();
      await expect(page.getByText(/reservatório/).first()).toBeVisible();
    },
  },
  { nome: 'simulado-config', rota: '/simulado', papel: 'estudante', espera: /Começar simulado/ },
  {
    nome: 'simulado-prova',
    rota: '/simulado',
    papel: 'estudante',
    espera: /Começar simulado/,
    passos: async (page) => {
      await page.getByRole('button', { name: 'Começar simulado' }).click();
      await expect(page.getByText(/reservatório/).first()).toBeVisible();
    },
  },
  {
    nome: 'simulado-resultado',
    rota: '/simulado',
    papel: 'estudante',
    espera: /Começar simulado/,
    passos: async (page) => {
      await page.getByRole('button', { name: 'Começar simulado' }).click();
      await expect(page.getByText(/reservatório/).first()).toBeVisible();
      await page.getByRole('button', { name: /Finalizar simulado agora/ }).click();
      await page.getByRole('button', { name: /Finalizar e ver relatório/ }).click();
      await expect(page.getByText(/65/).first()).toBeVisible();
    },
  },
  { nome: 'perfil', rota: '/perfil', papel: 'estudante' },
  { nome: 'mapa-conhecimento', rota: '/mapa-conhecimento', papel: 'estudante' },
  { nome: 'previsao-nota', rota: '/previsao-nota', papel: 'estudante' },
  { nome: 'relatorio-familiar', rota: '/relatorio-familiar', papel: 'estudante' },
  { nome: 'minha-narrativa', rota: '/minha-narrativa', papel: 'estudante' },
  { nome: 'certificados', rota: '/certificados', papel: 'estudante' },
  { nome: 'tutor', rota: '/tutor', papel: 'estudante' },
  { nome: 'redacao', rota: '/redacao', papel: 'estudante' },
  { nome: 'instituicao', rota: '/instituicao', papel: 'admin_instituicao', espera: /Por turma/ },
  { nome: 'instituicao-academico', rota: '/instituicao/academico', papel: 'admin_instituicao', espera: /Configuração acadêmica/ },
  { nome: 'instituicao-importacao', rota: '/instituicao/importacao', papel: 'admin_instituicao', espera: /Importação e exportação/ },
  { nome: 'professor-institucional', rota: '/professor', papel: 'professor_institucional', espera: /Suas turmas/ },
  { nome: 'professor-independente', rota: '/professor', papel: 'professor_independente', espera: /Acompanhamento/ },
  { nome: 'nao-encontrada', rota: '/rota-que-nao-existe', papel: null },
];

const LARGURAS = [
  { nome: '360', width: 360, height: 740 },
  { nome: '768', width: 768, height: 1024 },
  { nome: '1024', width: 1024, height: 768 },
  { nome: '1440', width: 1440, height: 900 },
  { nome: '1920', width: 1920, height: 1080 },
] as const;
const TEMAS: Tema[] = ['light', 'dark'];

test.skip(!PASTA, 'Defina E2E_SHOTS para gravar as capturas.');

for (const captura of CAPTURAS.filter((c) => !SO || SO.includes(c.nome))) {
  for (const tema of TEMAS) {
    for (const largura of LARGURAS) {
      test(`${captura.nome} · ${tema} · ${largura.nome}`, async ({ page }) => {
        await page.setViewportSize({ width: largura.width, height: largura.height });
        // Aurora e demais animações param, para a imagem sair igual a cada rodada.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        if (captura.papel) await autenticar(page.context(), captura.papel, tema);
        else await page.addInitScript((t) => localStorage.setItem('notaa:tema', t), tema);

        await page.goto(captura.rota);
        if (captura.espera) await expect(page.getByText(captura.espera).filter({ visible: true }).first()).toBeVisible();
        await page.waitForLoadState('networkidle');
        await captura.passos?.(page);
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(500);

        // Em vez de fullPage (que espalha a barra fixa e a navegação inferior pelo meio da imagem),
        // a janela cresce até a altura da página e a captura é só da janela.
        const altura = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: largura.width, height: Math.min(Math.max(altura, largura.height), 6000) });
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${PASTA}/${MOMENTO}/${captura.nome}-${tema}-${largura.nome}.png` });
      });
    }
  }
}
