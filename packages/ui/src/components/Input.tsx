// docs/07 §5, §7 — Input. Superfície + borda, foco visível, estado de erro acessível
// (aria-invalid + aria-describedby). Alvo de toque >= 44px.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Estado de erro: aplica borda de erro e marca aria-invalid. */
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { error = false, className, 'aria-invalid': ariaInvalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={ariaInvalid ?? (error || undefined)}
      className={cn(
        'min-h-[44px] w-full rounded-sm border bg-surface px-3 py-2 font-text text-base text-ink',
        'placeholder:text-ink-muted',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
        'disabled:pointer-events-none disabled:bg-surface-sunken disabled:text-ink-muted',
        error ? 'border-2 border-danger' : 'border-line-strong',
        className,
      )}
      {...props}
    />
  );
});
