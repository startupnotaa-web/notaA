// docs/07 §7 — Stepper. Lista ordenada com o passo atual marcado por
// aria-current="step"; estado concluído/atual/futuro aparece em número/ícone E
// texto, nunca só na cor.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  passos: readonly string[];
  /** Índice (0-based) do passo atual. */
  atual: number;
  /** Se informado, passos já concluídos viram botões para voltar a eles. */
  onIrPara?: (indice: number) => void;
}

export const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  { passos, atual, onIrPara, className, ...props },
  ref,
) {
  return (
    <ol ref={ref} className={cn('flex flex-wrap items-center gap-2', className)} {...props}>
      {passos.map((rotulo, i) => {
        const estado = i < atual ? 'concluido' : i === atual ? 'atual' : 'futuro';
        const marcador = (
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold',
              // Texto sobre superfície, não branco sobre verde (1,77:1): o estado vem do ✓ e da borda.
              estado === 'concluido' && 'border-2 border-success bg-surface-2 text-text',
              estado === 'atual' && 'bg-brand-secondary text-on-primary',
              estado === 'futuro' && 'border border-border text-text-muted',
            )}
          >
            {estado === 'concluido' ? '✓' : i + 1}
          </span>
        );
        const texto = (
          <span className={cn('text-sm', estado === 'atual' ? 'font-semibold text-text' : 'text-text-muted')}>
            {rotulo}
            <span className="sr-only">
              {estado === 'concluido' ? ' (concluído)' : estado === 'atual' ? ' (passo atual)' : ''}
            </span>
          </span>
        );
        return (
          <li key={rotulo} aria-current={estado === 'atual' ? 'step' : undefined} className="flex items-center gap-2">
            {estado === 'concluido' && onIrPara ? (
              <button
                type="button"
                onClick={() => onIrPara(i)}
                className="flex min-h-[44px] items-center gap-2 rounded-md px-1 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {marcador}
                {texto}
              </button>
            ) : (
              <span className="flex min-h-[44px] items-center gap-2 px-1">
                {marcador}
                {texto}
              </span>
            )}
            {i < passos.length - 1 ? (
              <span aria-hidden="true" className="hidden h-px w-6 bg-border sm:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
});
