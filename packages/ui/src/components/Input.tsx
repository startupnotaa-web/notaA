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
        'min-h-[44px] w-full rounded-md border bg-surface px-3 py-2 text-base text-text',
        'placeholder:text-text-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50 disabled:pointer-events-none',
        error ? 'border-error' : 'border-border',
        className,
      )}
      {...props}
    />
  );
});
