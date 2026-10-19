// Preset Tailwind do Nota A. Só referencia as variáveis de src/tokens/tokens.css,
// então trocar de tema é trocar data-theme, sem recompilar utilitários.
//
// Texto:    text-display, text-heading-1…3, text-figure, text-lead, text-body, text-body-sm, text-label, text-caption
// Espaço:   p-space-5, gap-space-6, mt-space-7… (a escala de 4px do design system; p-5 continua sendo o do Tailwind)
// Layout:   max-w-pagina (1760px), w-sidenav, h-topbar; Movimento: duration-fast|base|slow e ease-out|ease-in-out (as curvas dos tokens, não as do Tailwind)
const estilo = (nome) => [
  `var(--text-${nome}-size)`,
  {
    lineHeight: `var(--text-${nome}-lh)`,
    letterSpacing: `var(--text-${nome}-tracking)`,
    fontWeight: `var(--text-${nome}-weight)`,
  },
];

const espaco = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`space-${n}`, `var(--space-${n})`]));

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
        'violet-tint': 'var(--violet-tint)', 'cyan-tint': 'var(--cyan-tint)',
        // Cores exatas do símbolo: só em formas (gradiente da marca, aurora, losango), nunca em texto.
        'brand-cyan': 'var(--brand-cyan)', 'brand-violet': 'var(--brand-violet)',
        'brand-magenta': 'var(--brand-magenta)', 'brand-blue': 'var(--brand-blue)',
        scrim: 'var(--scrim)'
      },
      fontFamily: { display: ['var(--font-display)'], text: ['var(--font-text)'] },
      fontSize: {
        display: estilo('display'),
        'heading-1': estilo('heading-1'),
        'heading-2': estilo('heading-2'),
        'heading-3': estilo('heading-3'),
        figure: estilo('figure'),
        lead: estilo('lead'),
        body: estilo('body'),
        'body-sm': estilo('body-sm'),
        label: estilo('label'),
        caption: estilo('caption')
      },
      spacing: espaco,
      maxWidth: { pagina: 'var(--page-max)', texto: '72ch' },
      width: { sidenav: 'var(--sidenav-w)', 'sidenav-recolhida': 'var(--sidenav-w-collapsed)' },
      height: { topbar: 'var(--topbar-h)' },
      minHeight: { topbar: 'var(--topbar-h)' },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', pill: 'var(--radius-pill)' },
      boxShadow: { raise: 'var(--shadow-raise)' },
      transitionDuration: { fast: 'var(--duration-fast)', base: 'var(--duration-base)', slow: 'var(--duration-slow)' },
      transitionTimingFunction: { out: 'var(--ease-out)', 'in-out': 'var(--ease-in-out)' }
    }
  }
};
