// docs/07 §3 — Progress (barra linear). Preenchimento sempre em `primary`: o gradiente da marca
// é só do ProgressTrail, da Aurora e do símbolo. role="progressbar" + aria-valuenow/min/max (doc 07 §7).
import * as React from 'react';
import { cn } from '../lib/cn';

export interface ProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Valor atual (0..max). */
  value: number;
  max?: number;
  /** Rótulo visível acima da barra; também usado como aria-label se presente. */
  label?: string;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { value, max = 100, label, className, ...props },
  ref,
) {
  const safeMax = max <= 0 ? 100 : max;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const pct = (clamped / safeMax) * 100;

  return (
    <div ref={ref} className={cn('w-full', className)} {...props}>
      {label ? (
        <div className="mb-2 flex justify-between text-body-sm text-ink-muted">
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
        className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-slow ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});
