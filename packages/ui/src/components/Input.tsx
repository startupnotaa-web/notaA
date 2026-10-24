// docs/07 §5, §7 — Input. Mesma forma do controle de Campo/TextField: superfície + borda,
// foco visível, estado de erro acessível (aria-invalid + aria-describedby). Alvo de toque >= 44px.
import * as React from 'react';
import { cn } from '../lib/cn';
import { classesDoControle } from './Campo';

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
      className={cn(classesDoControle(error), 'py-2 disabled:pointer-events-none', className)}
      {...props}
    />
  );
});
