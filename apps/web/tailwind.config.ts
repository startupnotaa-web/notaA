import type { Config } from 'tailwindcss';
import notaA from '@notaa/ui/tailwind.preset.js';

// Ponte Tailwind → tokens do Nota A (docs/07-design-system.md). Tailwind nunca
// define cor/espaçamento por conta própria: só referencia as variáveis de @notaa/ui.
// O tema troca por data-theme em <html>, sem recompilar utilitários.
export default {
  presets: [notaA],
  darkMode: ['selector', '[data-theme="dark"]'],
  // Inclui os componentes de @notaa/ui — suas classes precisam ser varridas pelo
  // Tailwind, senão o purge remove utilitários que só aparecem na biblioteca.
  content: ['./app/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-text)'],
        mono: ['ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
