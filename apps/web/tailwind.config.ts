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
      // TODO(design-system): nomes do sistema antigo, mantidos só para as telas de
      // aluno, família e onboarding que ainda não migraram. Cada um aponta para o
      // token novo equivalente. Remova um alias quando nenhuma tela o usar mais.
      colors: {
        bg: 'var(--paper)',
        'surface-2': 'var(--surface-sunken)',
        text: 'var(--ink)',
        'text-muted': 'var(--ink-muted)',
        border: 'var(--line)',
        'on-primary': 'var(--on-primary)',
        error: 'var(--danger)',
        'brand-primary': 'var(--primary)',
        'brand-secondary': 'var(--primary)',
        'brand-accent': 'var(--primary)',
        'brand-tassel': 'var(--brand-blue)',
      },
      fontFamily: {
        sans: ['var(--font-text)'],
        mono: ['ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: 'var(--radius-lg)',
        full: 'var(--radius-pill)',
      },
      boxShadow: {
        1: 'none',
        2: 'none',
        brand: 'none',
      },
      backgroundImage: {
        'gradient-brand':
          'linear-gradient(135deg, var(--brand-cyan), var(--brand-violet), var(--brand-magenta))',
      },
    },
  },
  plugins: [],
} satisfies Config;
