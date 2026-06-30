// Config ESLint compartilhada (flat config). Cada app/package estende isto
// e adiciona a regra no-restricted-imports específica da sua camada (doc 09 §2).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // "**/" no início é necessário: cada app/package roda `eslint .` com cwd
    // própria, então um padrão sem "**/" só casaria com a raiz daquele cwd —
    // não com dist/ aninhado caso o pacote tenha subpastas (ex.: packages/db).
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/next-env.d.ts', // gerado pelo Next.js — não editar/lintar
      '**/public/sw.js', // bundle compilado pelo plugin Serwist (next build)
    ],
  },
];

export default baseConfig;
