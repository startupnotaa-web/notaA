// docs/07 §3, §8 — Button. Padrão = roxo (brand-secondary) + branco (AA).
// CTA = gradiente da marca, texto grande/bold + glow. Foco e disabled tratados.
import * as React from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'cta' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renderiza o filho único como raiz (ex.: <a>), mesclando classes. */
  asChild?: boolean;
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-md ' +
  'transition-colors duration-base select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<ButtonVariant, string> = {
  // Botão padrão: roxo sólido + branco (único sólido que passa AA normal — doc 07 §8).
  primary: 'bg-brand-secondary text-on-primary hover:opacity-90 shadow-1',
  // CTA: gradiente da marca, texto branco grande/bold + glow (doc 07 §3, §8).
  cta: 'bg-gradient-brand text-white font-bold text-lg shadow-brand hover:opacity-95',
  // Secundário: contorno com borda da marca, sem preenchimento.
  secondary: 'bg-transparent text-text border border-border hover:bg-surface-2',
  // Ghost: sem borda nem fundo até hover.
  ghost: 'bg-transparent text-text hover:bg-surface-2',
};

// md/lg garantem alvo de toque >= 44px (doc 07 §5).
const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'min-h-[44px] px-4 text-base',
  lg: 'min-h-[44px] px-6 text-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', asChild = false, fullWidth = false, className, children, ...props },
  ref,
) {
  const classes = cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: cn(classes, child.props.className),
    });
  }

  return (
    <button ref={ref} className={classes} {...props}>
      {children}
    </button>
  );
});
