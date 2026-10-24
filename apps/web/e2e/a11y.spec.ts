// Acessibilidade das telas migradas, em navegador de verdade, com sessão e API simuladas
// (e2e/fixtures.ts). Cobre os dois temas e cinco larguras (360, 768, 1024, 1440 e 1920):
// axe nas regras WCAG 2.x A e AA (inclui contraste real), alvos de 44px e foco visível.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { autenticar, modoReal, papelReal, type Papel, type Tema } from './fixtures';

interface Rota {
  rota: string;
  papel: Papel | null; // null = rota pública, sem sessão
  /** Texto que prova que a tela carregou com dados, não só o esqueleto. */
  espera: string | RegExp;
}

const ROTAS: Rota[] = [
  { rota: '/instituicao', papel: 'admin_instituicao', espera: /Por turma/ },
  { rota: '/instituicao/academico', papel: 'admin_instituicao', espera: /Configuração acadêmica/ },
  { rota: '/instituicao/importacao', papel: 'admin_instituicao', espera: /Importação e exportação/ },
  { rota: '/professor', papel: 'professor_institucional', espera: /Suas turmas/ },
  { rota: '/professor', papel: 'professor_independente', espera: /Acompanhamento/ },
  { rota: '/dashboard', papel: 'estudante', espera: /XP/ },
  { rota: '/estudo', papel: 'estudante', espera: /Ferramentas de prática/ },
  { rota: '/trilhas', papel: 'estudante', espera: /Funções e gráficos/ },
  { rota: '/quiz', papel: 'estudante', espera: /Escolha uma área/ },
  { rota: '/simulado', papel: 'estudante', espera: /Começar simulado/ },
  { rota: '/perfil', papel: 'estudante', espera: /Informações pessoais/ },
  { rota: '/mapa-conhecimento', papel: 'estudante', espera: /Mapa do conhecimento/ },
  { rota: '/previsao-nota', papel: 'estudante', espera: /Média geral estimada/ },
  { rota: '/relatorio-familiar', papel: 'estudante', espera: /Boletim de progresso/ },
  { rota: '/minha-narrativa', papel: 'estudante', espera: /Linha do tempo/ },
  { rota: '/certificados', papel: 'estudante', espera: /Conquistas desbloqueadas/ },
  { rota: '/tutor', papel: 'estudante', espera: /Tutor socrático/ },
  { rota: '/redacao', papel: 'estudante', espera: /Corretor de redação/ },
  { rota: '/onboarding', papel: 'estudante', espera: /Boas-vindas/ },
  { rota: '/', papel: null, espera: /Um só caminho/ },
  { rota: '/aluno', papel: null, espera: /Um passo por dia/ },
  { rota: '/professores', papel: null, espera: /Você dá a aula/ },
  { rota: '/escola', papel: null, espera: /A regra de média da sua instituição/ },
  { rota: '/faculdade', papel: null, espera: /ENADE com método/ },
  { rota: '/privacidade', papel: null, espera: /Política de privacidade/ },
  { rota: '/termos', papel: null, espera: /Termos de uso/ },
  { rota: '/login', papel: null, espera: /Entrar no Nota A/ },
  { rota: '/cadastro', papel: null, espera: /Criar conta no Nota A/ },
];

const LARGURAS = [
  { nome: '1920', width: 1920, height: 1080 },
  { nome: '1440', width: 1440, height: 900 },
  { nome: '1024', width: 1024, height: 768 },
  { nome: '768', width: 768, height: 1024 },
  { nome: '360', width: 360, height: 740 },
] as const;
const TEMAS: Tema[] = ['light', 'dark'];

const PASTA_DE_CAPTURAS = process.env.E2E_SHOTS;

async function abrir(page: Page, { rota, papel, espera }: Rota, tema: Tema) {
  if (papel) await autenticar(page.context(), papel, tema);
  else await page.addInitScript((t) => localStorage.setItem('notaa:tema', t), tema);
  await page.goto(rota);
  await expect(page.getByText(espera).filter({ visible: true }).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', tema);
}

/** Roda as quatro verificações na tela como ela está agora. `onde` identifica a aba nas mensagens. */
async function auditar(page: Page, onde: string) {
  // Espera as animações de entrada (menu, aviso, diálogo) acabarem: o axe mede o contraste no meio
  // de um fade-in e acusaria um falso baixo contraste. A aurora é infinita e fica de fora.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.effect?.getComputedTiming().iterations === Infinity || a.playState === 'finished'),
  );
  // 1) axe: nenhuma violação WCAG 2.0/2.1 A ou AA (inclui contraste de cor).
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      violations.map(
        (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 110)} ${n.any[0]?.message ?? ''}`).join(' | ')}`,
      ),
      `${onde}: axe`,
    ).toEqual([]);

    // 2) Nada empurra a página para os lados: sem rolagem horizontal da janela.
    const transbordo = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(transbordo, `${onde}: rolagem horizontal da página`).toBeLessThanOrEqual(0);

    // 3) Alvos de toque: botões, abas, campos e links de navegação com pelo menos 44px.
    const pequenos = await page.evaluate(() => {
      const seletor =
        'button, [role="tab"], [role="menuitem"], select, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), nav a';
      return Array.from(document.querySelectorAll<HTMLElement>(seletor))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const estilo = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && estilo.visibility !== 'hidden' && !el.closest('.sr-only');
        })
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.height < 43.5 || r.width < 43.5)
        .map(({ el, r }) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    });
    expect(pequenos, `${onde}: alvos menores que 44px`).toEqual([]);

    // 4) Foco visível: cada controle que recebe foco por Tab mostra contorno sólido de pelo menos 2px.
    const semFoco: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const e = getComputedStyle(el);
        return {
          nome: `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}"`,
          estilo: e.outlineStyle,
          largura: parseFloat(e.outlineWidth),
          folga: parseFloat(e.outlineOffset),
        };
      });
      if (info && (info.estilo === 'none' || info.largura < 2)) semFoco.push(`${info.nome}: ${info.estilo} ${info.largura}px`);
    }
    expect(semFoco, `${onde}: foco sem contorno`).toEqual([]);
}

// No modo conta real só vale a rota do papel da conta; as públicas rodam sempre.
const ROTAS_DO_MODO = ROTAS.filter((r) => !modoReal || r.papel === null || r.papel === papelReal);

for (const rota of ROTAS_DO_MODO) {
  for (const tema of TEMAS) {
    for (const largura of LARGURAS) {
      test(`${rota.rota}${rota.papel ? ` (${rota.papel})` : ''} · ${tema} · ${largura.nome}`, async ({ page }) => {
        await page.setViewportSize({ width: largura.width, height: largura.height });
        await abrir(page, rota, tema);

        if (PASTA_DE_CAPTURAS) {
          const nome = `${rota.rota === '/' ? 'landing' : rota.rota.slice(1).replace(/\//g, '-')}-${tema}-${largura.nome}.png`;
          await page.screenshot({ path: `${PASTA_DE_CAPTURAS}/${nome}`, fullPage: true });
        }

        await auditar(page, 'inicial');

        // Cada aba é outra tela: repete as verificações em todas.
        const abas = await page.getByRole('tab').all();
        for (const aba of abas) {
          const nome = (await aba.textContent())?.trim() ?? '?';
          await aba.click();
          await page.waitForLoadState('networkidle');
          await auditar(page, `aba ${nome}`);
        }
      });
    }
  }
}
