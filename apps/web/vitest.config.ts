import { defineConfig } from 'vitest/config';

// Só o que é função pura em lib/. As specs de e2e/ são do Playwright e rodam por `pnpm e2e`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
