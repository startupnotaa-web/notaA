// Lighthouse (acessibilidade e desempenho) nas rotas principais, com a mesma sessão e API simuladas
// de a11y.spec.ts. As metas são acessibilidade >= 95 e desempenho >= 90, em desktop e em celular.
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
const META_DESEMPENHO = 90;
// Páginas públicas: o LCP simulado em 4G lento (o perfil móvel do Lighthouse) não passa de 2,5 s.
const META_LCP_MS = 2500;
const PUBLICAS_COM_LCP = ['/', '/aluno', '/professores', '/escola', '/faculdade'];
const PORTA = 9333;

const ROTAS: { rota: string; papel: Papel | null }[] = [
  { rota: '/instituicao', papel: 'admin_instituicao' },
  { rota: '/instituicao/academico', papel: 'admin_instituicao' },
  { rota: '/instituicao/importacao', papel: 'admin_instituicao' },
  { rota: '/professor', papel: 'professor_institucional' },
  { rota: '/dashboard', papel: 'estudante' },
  { rota: '/estudo', papel: 'estudante' },
  { rota: '/perfil', papel: 'estudante' },
  { rota: '/', papel: null },
  { rota: '/aluno', papel: null },
  { rota: '/professores', papel: null },
  { rota: '/escola', papel: null },
  { rota: '/faculdade', papel: null },
  { rota: '/login', papel: null },
];

// lighthouse é ESM puro e o Playwright compila os testes para CommonJS: import() dinâmico "de verdade".
const importar = new Function('m', 'return import(m)') as (m: string) => Promise<{ default: LighthouseFn }>;
type LighthouseFn = (
  url: string,
  flags: Record<string, unknown>,
) => Promise<{ lhr: { finalDisplayedUrl: string; categories: { accessibility: { score: number | null }; performance: { score: number | null } }; audits: Record<string, { score: number | null; title: string; numericValue?: number }> } } | undefined>;

for (const tema of ['light', 'dark'] as const) {
  for (const formato of ['desktop', 'mobile'] as const) {
    test(`acessibilidade ≥ ${META} e desempenho ≥ ${META_DESEMPENHO} · ${tema} · ${formato}`, async ({ baseURL }) => {
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
            onlyCategories: ['accessibility', 'performance'],
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
          const desempenho = Math.round((resultado?.lhr.categories.performance.score ?? 0) * 100);
          const reprovadas = Object.values(resultado?.lhr.audits ?? {})
            .filter((a) => a.score === 0)
            .map((a) => a.title);
          const lcp = Math.round(resultado?.lhr.audits['largest-contentful-paint']?.numericValue ?? 0);
          notas.push(`${rota} (${papel ?? 'público'}): ${nota} · desempenho ${desempenho} · LCP ${lcp}ms${reprovadas.length ? ` · reprovou: ${reprovadas.join('; ')}` : ''}`);
        } finally {
          await ctx.close();
          rmSync(perfil, { recursive: true, force: true });
        }
      }
      console.log(`\n${tema} · ${formato}\n  ${notas.join('\n  ')}`);
      const abaixo = notas.filter((n) => Number(/: (\d+)/.exec(n)?.[1]) < META);
      expect(abaixo, `rotas com acessibilidade abaixo de ${META}`).toEqual([]);
      const lentas = notas.filter((n) => Number(/desempenho (\d+)/.exec(n)?.[1]) < META_DESEMPENHO);
      expect(lentas, `rotas com desempenho abaixo de ${META_DESEMPENHO}`).toEqual([]);
      const lcpAlto = notas.filter((n) => PUBLICAS_COM_LCP.some((r) => n.startsWith(`${r} (`)) && Number(/LCP (\d+)ms/.exec(n)?.[1]) > META_LCP_MS);
      expect(lcpAlto, `páginas públicas com LCP acima de ${META_LCP_MS} ms`).toEqual([]);
    });
  }
}
