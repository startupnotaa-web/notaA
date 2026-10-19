// Cabeçalho de página: o h1 (um por tela), o subtítulo e as ações. A ação principal é uma só.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Chip de status ao lado do título (ex.: "Rascunho"). */
  status?: React.ReactNode;
  /** Ações à direita; no celular descem para baixo do título. */
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, status, actions, className, ...props }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-space-5', className)} {...props}>
      <div className="flex min-w-[min(18rem,100%)] flex-1 flex-col gap-space-2">
        <div className="flex flex-wrap items-center gap-x-space-4 gap-y-space-2">
          <h1 className="m-0 font-display text-[28px] leading-9 tracking-[-0.02em] text-ink sm:text-heading-1">{title}</h1>
          {status}
        </div>
        {description ? <div className="max-w-texto text-body text-ink-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-space-3">{actions}</div> : null}
    </header>
  );
}
