// docs/07 §6 — Skeleton (bloco de carregamento). Estático de propósito: só a Aurora se move sozinha.
// O carregamento é anunciado pela região `Carregando` (role="status", aria-busy e texto para leitor de tela).
import * as React from 'react';
import { cn } from '../lib/cn';

export const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function Skeleton({ className, ...props }, ref) {
    return <div ref={ref} aria-hidden="true" className={cn('rounded-md bg-surface-sunken', className)} {...props} />;
  },
);

/** Linhas de texto em esqueleto; a última é mais curta. */
export function SkeletonText({ linhas = 3, className }: { linhas?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex flex-col gap-space-2', className)}>
      {Array.from({ length: linhas }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i === linhas - 1 && linhas > 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** Linhas de tabela em esqueleto. */
export function SkeletonLinhas({ linhas = 4, className }: { linhas?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex flex-col', className)}>
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="flex items-center gap-space-4 border-t border-line py-space-3 first:border-t-0">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Região de carregamento: avisa leitores de tela que o conteúdo está a caminho.
 * Coloque os esqueletos dentro dela.
 */
export function Carregando({
  rotulo = 'Carregando',
  className,
  children,
}: {
  rotulo?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{rotulo}…</span>
      {children}
    </div>
  );
}
