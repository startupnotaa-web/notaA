'use client';
// Opção selecionável (interesses e áreas no onboarding). Não é o Chip de status:
// aqui a pessoa liga e desliga a opção, e aria-pressed diz o estado.
import * as React from 'react';
import { cn } from '../lib/cn';
import { EASE_OUT, FOCO } from '../lib/foco';

export interface ChoiceChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  selected?: boolean;
  /** Ícone opcional à esquerda. */
  icon?: React.ReactNode;
}

export const ChoiceChip = React.forwardRef<HTMLButtonElement, ChoiceChipProps>(function ChoiceChip(
  { selected = false, icon, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-2 rounded-pill border px-4 font-text text-sm font-bold',
        `transition-colors duration-fast ${EASE_OUT} disabled:pointer-events-none disabled:opacity-50`,
        FOCO,
        selected
          ? 'border-primary bg-violet-tint text-primary'
          : 'border-line-strong bg-surface text-ink hover:bg-surface-sunken',
        className,
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
});
