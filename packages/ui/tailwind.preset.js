// Preset Tailwind do Nota A. Só referencia as variáveis de src/tokens/tokens.css,
// então trocar de tema é trocar data-theme, sem recompilar utilitários.
module.exports = {
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)', surface: { DEFAULT: 'var(--surface)', sunken: 'var(--surface-sunken)' },
        line: { DEFAULT: 'var(--line)', strong: 'var(--line-strong)' },
        ink: { DEFAULT: 'var(--ink)', muted: 'var(--ink-muted)' },
        primary: { DEFAULT: 'var(--primary)', hover: 'var(--primary-hover)', on: 'var(--on-primary)' },
        focus: 'var(--focus)', info: 'var(--info)',
        success: { DEFAULT: 'var(--success)', tint: 'var(--success-tint)' },
        warning: { DEFAULT: 'var(--warning)', tint: 'var(--warning-tint)' },
        danger: { DEFAULT: 'var(--danger)', tint: 'var(--danger-tint)' },
        'violet-tint': 'var(--violet-tint)', 'cyan-tint': 'var(--cyan-tint)'
      },
      fontFamily: { display: ['var(--font-display)'], text: ['var(--font-text)'] },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', pill: 'var(--radius-pill)' },
      boxShadow: { raise: 'var(--shadow-raise)' },
      transitionDuration: { fast: '160ms', base: '240ms', slow: '420ms' }
    }
  }
};
