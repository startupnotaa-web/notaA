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
  neutral: 'bg-surface-sunken text-ink border-transparent',
  success: 'bg-success-tint text-success border-transparent',
  warning: 'bg-warning-tint text-warning border-transparent',
  error: 'bg-danger-tint text-danger border-transparent',
  info: 'bg-cyan-tint text-info border-transparent',
  brand: 'bg-violet-tint text-primary border-transparent',
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
