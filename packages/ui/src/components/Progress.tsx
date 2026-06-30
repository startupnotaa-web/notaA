// docs/07 §3 — Progress (barra linear). gradient=true reserva o gradiente da marca
// para XP/conquista. role="progressbar" + aria-valuenow/min/max (doc 07 §7).
import * as React from 'react';
import { cn } from '../lib/cn';

export interface ProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Valor atual (0..max). */
  value: number;
  max?: number;
  /** Rótulo visível acima da barra; também usado como aria-label se presente. */
  label?: string;
  /** Usa o gradiente da marca (XP/conquista). Senão, preenchimento roxo sólido. */
  gradient?: boolean;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { value, max = 100, label, gradient = false, className, ...props },
  ref,
) {
  const safeMax = max <= 0 ? 100 : max;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const pct = (clamped / safeMax) * 100;

  return (
    <div ref={ref} className={cn('w-full', className)} {...props}>
      {label ? (
        <div className="mb-1 flex justify-between text-sm text-text-muted">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-base',
            gradient ? 'bg-gradient-brand' : 'bg-brand-secondary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});
