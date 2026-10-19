// docs/07 §3 — SectionHeader. Título em Sora (acento opcional na cor `primary`) + descrição opcional
// + slot de ação à direita. Os tamanhos vêm dos estilos de texto dos tokens.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface SectionHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Trecho do título na cor primary. */
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
      h1: 'text-[28px] leading-9 tracking-[-0.02em] sm:text-heading-1',
      h2: 'text-heading-2',
      h3: 'text-heading-3',
    }[as];
    return (
      <div
        ref={ref}
        className={cn('flex flex-wrap items-start justify-between gap-space-4', className)}
        {...props}
      >
        <div className="flex min-w-[min(16rem,100%)] flex-1 flex-col gap-space-2">
          <Heading className={cn('font-display font-semibold text-ink', tamanho)}>
            {title}
            {accent ? (
              <>
                {' '}
                <span className="text-primary">{accent}</span>
              </>
            ) : null}
          </Heading>
          {description ? <p className="max-w-texto text-body text-ink-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    );
  },
);
