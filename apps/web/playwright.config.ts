import { defineConfig } from '@playwright/test';

// Os testes rodam contra o app já compilado: `pnpm build` antes, com as variáveis públicas do
// Supabase (qualquer valor serve no modo simulado; o app exige que existam).
const PORTA = 3100;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORTA}` },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm exec next start -p ${PORTA}`,
        url: `http://localhost:${PORTA}/login`,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
