// docs/07 §3 — SectionHeader. Título (acento opcional em gradiente via bg-clip-text,
// sempre grande/bold) + descrição opcional + slot de ação à direita.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface SectionHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Trecho do título realçado com o gradiente da marca (grande/bold). */
  accent?: React.ReactNode;
  /** Ação à direita (ex.: botão "ver tudo"). */
  action?: React.ReactNode;
  /** Nível semântico do título. */
  as?: 'h1' | 'h2' | 'h3';
}

export const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  function SectionHeader(
    { title, description, accent, action, as = 'h2', className, ...props },
    ref,
  ) {
    const Heading = as;
    return (
      <div
        ref={ref}
        className={cn('flex items-start justify-between gap-4', className)}
        {...props}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <Heading className="text-2xl font-bold leading-tight text-text">
            {title}
            {accent ? (
              <>
                {' '}
                <span className="bg-gradient-brand bg-clip-text text-transparent">{accent}</span>
              </>
            ) : null}
          </Heading>
          {description ? <p className="text-sm text-text-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    );
  },
);
