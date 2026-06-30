import type { Config } from 'tailwindcss';

// Ponte Tailwind → design tokens (docs/07-design-system.md). Tailwind nunca
// define cor/espaçamento por conta própria — só referencia as variáveis CSS
// de @notaa/ui (tokens primeiro, doc 07 §1).
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  // Inclui os componentes de @notaa/ui — suas classes precisam ser varridas pelo
  // Tailwind, senão o purge remove utilitários que só aparecem na biblioteca.
  content: ['./app/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        border: 'var(--color-border)',
        primary: 'var(--color-primary)',
        'on-primary': 'var(--color-on-primary)',
        focus: 'var(--color-focus)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
        'brand-primary': 'var(--brand-primary)',
        'brand-secondary': 'var(--brand-secondary)',
        'brand-accent': 'var(--brand-accent)',
        'brand-tassel': 'var(--brand-tassel)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        brand: 'var(--glow-brand)',
      },
      backgroundImage: {
        'gradient-brand': 'var(--gradient-brand)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
      },
    },
  },
  plugins: [],
} satisfies Config;
