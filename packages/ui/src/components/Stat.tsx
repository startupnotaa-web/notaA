// docs/07 §4 — Stat. Rótulo + valor grande + hint opcional. Cards de métrica.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
}

export const Stat = React.forwardRef<HTMLDivElement, StatProps>(function Stat(
  { label, value, hint, className, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn('flex flex-col gap-1', className)} {...props}>
      <span className="text-sm font-medium text-text-muted">{label}</span>
      <span className="text-2xl font-bold leading-tight text-text">{value}</span>
      {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
    </div>
  );
});
