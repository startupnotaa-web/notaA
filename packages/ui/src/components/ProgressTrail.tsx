import * as React from 'react';
import { cn } from '../lib/cn';

export interface ProgressTrailProps {
  total: number;
  done: number;
  /** Nome acessível da barra de progresso. */
  label: string;
  caption?: React.ReactNode;
}

const GRADIENTE_DA_MARCA =
  'bg-[linear-gradient(135deg,var(--brand-cyan),var(--brand-violet)_60%,var(--brand-magenta))]';

/** Trilha de losangos (o capelo do símbolo). O avanço leva 420ms; a legenda diz onde a pessoa está. */
export function ProgressTrail({ total, done, label, caption }: ProgressTrailProps) {
  const etapas = Math.max(1, total);
  const feitas = Math.max(0, Math.min(etapas, done));
  const partes: React.ReactNode[] = [];
  for (let i = 0; i < etapas; i++) {
    if (i > 0) {
      partes.push(
        <span
          key={`l${i}`}
          aria-hidden="true"
          className={cn(
            'h-0.5 w-4 rounded-[1px] transition-colors duration-slow ease-[var(--ease-out)]',
            i <= feitas ? 'bg-[var(--brand-violet)]' : 'bg-line',
          )}
        />,
      );
    }
    const concluida = i < feitas;
    const atual = i === feitas;
    partes.push(
      <span
        key={`s${i}`}
        aria-hidden="true"
        className={cn(
          'box-border h-3.5 w-3.5 rotate-45 rounded-[3px] border transition-colors duration-slow ease-[var(--ease-out)]',
          concluida && cn('border-transparent', GRADIENTE_DA_MARCA),
          atual && 'border-2 border-primary bg-violet-tint',
          !concluida && !atual && 'border-line-strong bg-surface-sunken',
        )}
      />,
    );
  }
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={etapas}
      aria-valuenow={feitas}
      aria-valuetext={`${feitas} de ${etapas}`}
      className="flex items-center gap-2"
    >
      {partes}
      {caption ? <span className="ml-3 font-text text-sm leading-[22px] text-ink-muted">{caption}</span> : null}
    </div>
  );
}
