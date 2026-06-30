// docs/07 §6 — Skeleton (bloco de carregamento). animate-pulse respeita
// prefers-reduced-motion e o kill-switch [data-anim="off"] (tokens globais).
import * as React from 'react';
import { cn } from '../lib/cn';

export const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function Skeleton({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn('animate-pulse rounded-md bg-surface-2', className)}
        {...props}
      />
    );
  },
);
