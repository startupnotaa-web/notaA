'use client';
// docs/07 §7 — OptionCard (comporta-se como radio). Estado correct/incorrect
// mostra ÍCONE + RÓTULO, nunca só cor. Usado no quiz e onboarding.
import * as React from 'react';
import { cn } from '../lib/cn';

export type OptionCardState = 'neutral' | 'correct' | 'incorrect';

export interface OptionCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  selected?: boolean;
  state?: OptionCardState;
  /** Marcador à esquerda (letra A–E ou ícone). */
  leading?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
}

// Rótulo textual do estado (acessibilidade: informação não fica só na cor).
const stateLabel: Record<Exclude<OptionCardState, 'neutral'>, string> = {
  correct: 'Correta',
  incorrect: 'Incorreta',
};

// Ícone simples por estado (forma + cor, não só cor).
function StateIcon({ state }: { state: Exclude<OptionCardState, 'neutral'> }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white',
        state === 'correct' ? 'bg-success' : 'bg-error',
      )}
    >
      {state === 'correct' ? '✓' : '✕'}
    </span>
  );
}

export const OptionCard = React.forwardRef<HTMLButtonElement, OptionCardProps>(function OptionCard(
  { selected = false, state = 'neutral', leading, title, description, className, ...props },
  ref,
) {
  const isResult = state !== 'neutral';

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border p-4 text-left',
        'min-h-[44px] transition-colors duration-base',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50 disabled:pointer-events-none',
        state === 'correct' && 'border-success bg-surface-2',
        state === 'incorrect' && 'border-error bg-surface-2',
        state === 'neutral' &&
          (selected
            ? 'border-brand-secondary bg-surface-2 ring-2 ring-brand-secondary'
            : 'border-border bg-surface hover:bg-surface-2'),
        className,
      )}
      {...props}
    >
      {leading ? (
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 font-bold text-text">
          {leading}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium text-text">{title}</span>
        {description ? <span className="text-sm text-text-muted">{description}</span> : null}
      </span>
      {isResult ? (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
          <StateIcon state={state as Exclude<OptionCardState, 'neutral'>} />
          <span className={state === 'correct' ? 'text-success' : 'text-error'}>
            {stateLabel[state as Exclude<OptionCardState, 'neutral'>]}
          </span>
        </span>
      ) : null}
    </button>
  );
});
