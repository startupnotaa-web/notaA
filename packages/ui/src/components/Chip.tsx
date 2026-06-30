'use client';
// docs/07 §7 — Chip (tag selecionável). selected -> anel/borda da marca.
// aria-pressed para estado; alvo >= 44px. Para interesses/áreas no onboarding.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  selected?: boolean;
  /** Ícone opcional à esquerda. */
  icon?: React.ReactNode;
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected = false, icon, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium',
        'transition-colors duration-base',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50 disabled:pointer-events-none',
        selected
          ? 'border-brand-secondary bg-surface-2 text-text ring-2 ring-brand-secondary'
          : 'border-border bg-surface text-text-muted hover:bg-surface-2',
        className,
      )}
      {...props}
    >
      {icon ? <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
});
