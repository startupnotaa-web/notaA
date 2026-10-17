import * as React from 'react';
import { cn } from '../lib/cn';
import { EASE_OUT, FOCO } from '../lib/foco';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Ação principal (uma por área), secundária, discreta ou destrutiva. */
  variant?: ButtonVariant;
  /** md = 44px (padrão, alvo de toque); sm = 36px (barras de ferramentas). */
  size?: ButtonSize;
  /** Desabilita e mostra o indicador de carregamento. */
  loading?: boolean;
  children: React.ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-md border border-transparent font-text text-sm font-bold leading-5 ' +
  `transition-colors duration-fast ${EASE_OUT} no-underline disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`;

const variantes: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-on hover:bg-primary-hover',
  secondary: 'border-line-strong bg-surface text-ink hover:bg-surface-sunken',
  quiet: 'bg-transparent text-primary hover:bg-violet-tint',
  danger: 'border-danger bg-surface text-danger hover:bg-danger-tint',
};

const tamanhos: Record<ButtonSize, string> = {
  md: 'min-h-[44px] px-5',
  sm: 'min-h-[36px] px-4',
};

/** Classes do botão, para quem precisa da mesma aparência em outro elemento (ver ButtonLink). */
export function classesDoBotao(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cn(base, variantes[variant], tamanhos[size]);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      className={cn(classesDoBotao(variant, size), 'disabled:pointer-events-none', className)}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : null}
      {children}
    </button>
  );
});
