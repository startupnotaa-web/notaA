// docs/07 §7 — Badge. Nunca depende só de cor: texto sempre presente, ícone opcional.
import * as React from 'react';
import { cn } from '../lib/cn';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'brand';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Ícone opcional à esquerda do rótulo. */
  icon?: React.ReactNode;
}

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-2 text-text border-border',
  success: 'bg-surface-2 text-success border-success/40',
  warning: 'bg-surface-2 text-warning border-warning/40',
  error: 'bg-surface-2 text-error border-error/40',
  info: 'bg-surface-2 text-info border-info/40',
  brand: 'bg-gradient-brand text-white border-transparent',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = 'neutral', icon, className, children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className,
      )}
      {...props}
    >
      {icon ? <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span> : null}
      {children}
    </span>
  );
});
