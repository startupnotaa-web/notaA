import 'dotenv/config';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// dotenv/config carrega apps/api/.env ANTES dos testes — DbModule (global)
// precisa de DATABASE_URL definido para não falhar no bootstrap do AppModule
// nos e2e tests, mesmo quando o teste em si usa adaptadores em memória via
// override (a string de conexão do postgres-js é lazy: só conecta na 1ª query).

// Vitest usa esbuild por padrão, que NÃO emite metadata de decorators
// corretamente — a injeção de dependência do NestJS (que lê
// `design:paramtypes` via reflect-metadata) quebra silenciosamente em
// runtime mesmo com `tsc --noEmit` limpo. unplugin-swc + .swcrc corrige isso
// para os testes (receita oficial do NestJS para Vitest).
export default defineConfig({
  plugins: [swc.vite()],
});
