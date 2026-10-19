// docs/07 §5, §7 — Select nativo com a mesma pele do Input. Nativo de propósito:
// teclado, leitor de tela e celular já funcionam sem reimplementar listbox.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Estado de erro: aplica borda de erro e marca aria-invalid. */
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error = false, className, 'aria-invalid': ariaInvalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={ariaInvalid ?? (error || undefined)}
      className={cn(
        'min-h-[44px] w-full rounded-md border bg-surface px-3 py-2 text-base text-text',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50 disabled:pointer-events-none',
        error ? 'border-error' : 'border-border',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
