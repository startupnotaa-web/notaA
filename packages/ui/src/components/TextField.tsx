import * as React from 'react';
import { Campo, classesDoControle } from './Campo';
import { cn } from '../lib/cn';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** Substitui a dica e marca o campo como inválido. */
  error?: React.ReactNode;
  /** Rótulo só para leitores de tela (células de tabela). */
  labelOculto?: boolean;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, labelOculto, className, id, type = 'text', 'aria-describedby': describedBy, ...props },
  ref,
) {
  return (
    <Campo label={label} hint={hint} error={error} id={id} describedBy={describedBy} className={className} labelOculto={labelOculto}>
      {(ligacao) => <input ref={ref} type={type} className={cn(classesDoControle(Boolean(error)))} {...ligacao} {...props} />}
    </Campo>
  );
});
