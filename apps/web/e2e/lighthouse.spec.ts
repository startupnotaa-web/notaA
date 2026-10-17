// Lighthouse (categoria acessibilidade) nas rotas migradas, com a mesma sessão e API simuladas
// de a11y.spec.ts. A meta é nota >= 95 em desktop e em celular.
//
// O Lighthouse conversa com o Chromium pela porta de depuração e abre uma aba própria, sempre no
// contexto PADRÃO do navegador. Por isso cada rota roda num contexto persistente (que é o padrão) e a
// simulação vai no contexto: init script e rotas valem para a aba do Lighthouse também.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect, test } from '@playwright/test';
import { autenticar, modoReal, papelReal, type Papel } from './fixtures';

const META = 95;
const PORTA = 9333;

const ROTAS: { rota: string; papel: Papel | null }[] = [
  { rota: '/instituicao', papel: 'admin_instituicao' },
  { rota: '/instituicao/academico', papel: 'admin_instituicao' },
  { rota: '/instituicao/importacao', papel: 'admin_instituicao' },
  { rota: '/professor', papel: 'professor_institucional' },
  { rota: '/dashboard', papel: 'estudante' },
  { rota: '/', papel: null },
];

// lighthouse é ESM puro e o Playwright compila os testes para CommonJS: import() dinâmico "de verdade".
const importar = new Function('m', 'return import(m)') as (m: string) => Promise<{ default: LighthouseFn }>;
type LighthouseFn = (
  url: string,
  flags: Record<string, unknown>,
) => Promise<{ lhr: { finalDisplayedUrl: string; categories: { accessibility: { score: number | null } }; audits: Record<string, { score: number | null; title: string }> } } | undefined>;

for (const tema of ['light', 'dark'] as const) {
  for (const formato of ['desktop', 'mobile'] as const) {
    test(`acessibilidade ≥ ${META} · ${tema} · ${formato}`, async ({ baseURL }) => {
      test.setTimeout(240_000);
      const { default: lighthouse } = await importar('lighthouse');
      const notas: string[] = [];
      for (const { rota, papel } of ROTAS.filter((r) => !modoReal || r.papel === null || r.papel === papelReal)) {
        const perfil = mkdtempSync(join(tmpdir(), 'notaa-lh-'));
        const ctx = await chromium.launchPersistentContext(perfil, { args: [`--remote-debugging-port=${PORTA}`] });
        try {
          if (papel) await autenticar(ctx, papel, tema);
          else await ctx.addInitScript((t) => localStorage.setItem('notaa:tema', t), tema);
          const pagina = await ctx.newPage();
          await pagina.goto(`${baseURL}${rota}`);
          await pagina.waitForLoadState('networkidle');
          const resultado = await lighthouse(`${baseURL}${rota}`, {
            port: PORTA,
            output: 'json',
            logLevel: 'error',
            onlyCategories: ['accessibility'],
            formFactor: formato,
            screenEmulation:
              formato === 'desktop'
                ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
                : { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
            disableStorageReset: true,
          });
          // Se a sessão simulada falhasse, o app mandaria para /login e a nota seria a da tela errada.
          const final = new URL(resultado?.lhr.finalDisplayedUrl ?? baseURL ?? '').pathname;
          expect(final, `${rota} redirecionou`).toBe(rota);
          const nota = Math.round((resultado?.lhr.categories.accessibility.score ?? 0) * 100);
          const reprovadas = Object.values(resultado?.lhr.audits ?? {})
            .filter((a) => a.score === 0)
            .map((a) => a.title);
          notas.push(`${rota} (${papel ?? 'público'}): ${nota}${reprovadas.length ? ` · reprovou: ${reprovadas.join('; ')}` : ''}`);
        } finally {
          await ctx.close();
          rmSync(perfil, { recursive: true, force: true });
        }
      }
      console.log(`\n${tema} · ${formato}\n  ${notas.join('\n  ')}`);
      const abaixo = notas.filter((n) => Number(/: (\d+)/.exec(n)?.[1]) < META);
      expect(abaixo, `rotas abaixo de ${META}`).toEqual([]);
    });
  }
}
