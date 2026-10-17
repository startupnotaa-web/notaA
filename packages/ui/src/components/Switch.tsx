'use client';
// docs/07 §6, §7 — Switch acessível (role="switch", aria-checked). Alvo >= 44px.
// Para modo dislexia, reduzir gamificação, kill-switch de animação.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Rótulo acessível quando não há <Label> associado visível. */
  'aria-label'?: string;
  /** id de um elemento que rotula o switch. */
  'aria-labelledby'?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, disabled = false, className, ...aria },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        // Alvo de toque >= 44px garantido por min-h/min-w; o trilho é menor (centralizado).
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2',
        'transition-colors duration-base',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
      {...aria}
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-block h-6 w-11 rounded-full transition-colors duration-base',
          checked ? 'bg-primary' : 'border border-line-strong bg-surface-sunken',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-transform duration-base',
            checked ? 'translate-x-5 bg-primary-on' : 'bg-ink-muted',
          )}
        />
      </span>
    </button>
  );
});
