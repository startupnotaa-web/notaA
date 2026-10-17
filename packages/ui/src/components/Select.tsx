import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Campo, classesDoControle } from './Campo';
import { cn } from '../lib/cn';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: React.ReactNode;
  options: { value: string; label: string }[];
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Rótulo só para leitores de tela (células de tabela). */
  labelOculto?: boolean;
}

/** Select nativo de propósito: teclado, leitor de tela e celular funcionam sem reimplementar listbox. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, hint, error, labelOculto, className, id, 'aria-describedby': describedBy, ...props },
  ref,
) {
  return (
    <Campo label={label} hint={hint} error={error} id={id} describedBy={describedBy} className={className} labelOculto={labelOculto}>
      {(ligacao) => (
        <div className="relative">
          <select ref={ref} className={cn(classesDoControle(Boolean(error)), 'appearance-none pr-10')} {...ligacao} {...props}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
          />
        </div>
      )}
    </Campo>
  );
});
