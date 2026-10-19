// Capturas das páginas públicas para revisão do visual. Só grava PNGs; roda só com E2E_SHOTS definido.
//
//   E2E_SHOTS=../../design-handoff/landing-depois pnpm --filter @notaa/web exec playwright test e2e/capturas-landing.spec.ts
//
// Gera {E2E_SHOTS}/{rota}-{largura}.png com a cena 3D montada e {rota}-{largura}-estatico.png com a arte estática
// (movimento reduzido), em 390, 768, 1366 e 1920 px, página inteira.
import { expect, test } from '@playwright/test';

const PASTA = process.env.E2E_SHOTS;
const ROTAS = [
  { nome: 'home', rota: '/' },
  { nome: 'aluno', rota: '/aluno' },
  { nome: 'professores', rota: '/professores' },
  { nome: 'escola', rota: '/escola' },
  { nome: 'faculdade', rota: '/faculdade' },
];
const LARGURAS = [
  { nome: '390', width: 390, height: 844 },
  { nome: '768', width: 768, height: 1024 },
  { nome: '1366', width: 1366, height: 768 },
  { nome: '1920', width: 1920, height: 1080 },
];

test.skip(!PASTA, 'defina E2E_SHOTS para gravar as capturas');

for (const { nome, rota } of ROTAS) {
  for (const { nome: larg, width, height } of LARGURAS) {
    for (const modo of ['3d', 'estatico'] as const) {
      test(`${nome} · ${larg} · ${modo}`, async ({ browser }) => {
        const ctx = await browser.newContext({
          viewport: { width, height },
          reducedMotion: modo === 'estatico' ? 'reduce' : 'no-preference',
        });
        const page = await ctx.newPage();
        // Núcleos suficientes para o gate liberar o 3D (a máquina de captura pode ter poucos).
        await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }));
        await page.goto(rota);
        await expect(page.locator('[data-cena]')).toHaveAttribute('data-cena', modo === '3d' ? 'pronta' : 'estatica', { timeout: 30_000 });
        // A entrada da página e a abertura da cena terminam antes da foto.
        await page.waitForTimeout(modo === '3d' ? 3500 : 1500);
        await page.screenshot({ path: `${PASTA}/${nome}-${larg}${modo === 'estatico' ? '-estatico' : ''}.png`, fullPage: true });
        await ctx.close();
      });
    }
  }
}
