import * as React from 'react';
import { Campo, classesDoControle } from './Campo';
import { cn } from '../lib/cn';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** Substitui a dica e marca o campo como inválido. */
  error?: React.ReactNode;
  /** Rótulo só para leitores de tela (ex.: o campo de mensagem de um chat). */
  labelOculto?: boolean;
}

/** Campo de texto de várias linhas, com rótulo visível, dica e erro ligados por aria-describedby. */
export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, labelOculto, className, id, rows = 3, 'aria-describedby': describedBy, ...props },
  ref,
) {
  return (
    <Campo label={label} hint={hint} error={error} id={id} describedBy={describedBy} className={className} labelOculto={labelOculto}>
      {(ligacao) => (
        <textarea
          ref={ref}
          rows={rows}
          className={cn(classesDoControle(Boolean(error)), 'py-3 disabled:pointer-events-none')}
          {...ligacao}
          {...props}
        />
      )}
    </Campo>
  );
});
