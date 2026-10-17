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
    const tamanho = {
      h1: 'text-[32px] leading-10 tracking-[-0.01em]',
      h2: 'text-2xl leading-8',
      h3: 'text-[19px] leading-[26px]',
    }[as];
    return (
      <div
        ref={ref}
        className={cn('flex flex-wrap items-start justify-between gap-4', className)}
        {...props}
      >
        <div className="flex min-w-[min(16rem,100%)] flex-1 flex-col gap-1">
          <Heading className={cn('font-display font-semibold text-ink', tamanho)}>
            {title}
            {accent ? (
              <>
                {' '}
                <span className="text-primary">{accent}</span>
              </>
            ) : null}
          </Heading>
          {description ? <p className="text-base leading-[26px] text-ink-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    );
  },
);
