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
        // Fontes que só as landings de aluno (Sora 700/800) e de faculdade (Newsreader) carregam, cada uma no
        // próprio layout (app/(ambientes)/…/layout.tsx), para as outras rotas não pagarem por elas.
        pesada: ['var(--nf-sora-pesada)', 'var(--font-display)'],
        serifa: ['var(--nf-newsreader)', 'Georgia', 'serif'],
      },
      // Entrada da landing: um momento por tela, no topo (hero). Duração e curva dos tokens; o resto da
      // página só se move em resposta a quem usa. prefers-reduced-motion zera tudo em tokens/base.css.
      keyframes: {
        'landing-rise': { from: { opacity: '0', transform: 'translateY(22px)' }, to: { opacity: '1', transform: 'none' } },
        'landing-pop': {
          '0%': { opacity: '0', transform: 'translateY(26px) scale(0.96)' },
          '70%': { opacity: '1', transform: 'translateY(-3px) scale(1.01)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'landing-fade': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'landing-rise': 'landing-rise 720ms var(--ease-out) both',
        'landing-pop': 'landing-pop 640ms var(--ease-out) both',
        'landing-fade': 'landing-fade 1100ms var(--ease-in-out) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
