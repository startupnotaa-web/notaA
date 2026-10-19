// Seção leve: separa blocos de uma página por espaço e, quando precisa de divisão, por uma linha fina.
// É o padrão no lugar de uma grade de cartões. Painel (com borda e fundo) só agrupa formulário ou tabela.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Ação principal da seção, à direita do título. */
  action?: React.ReactNode;
  /** Nível semântico do título. */
  as?: 'h2' | 'h3';
  /** Linha fina e respiro acima da seção. */
  divided?: boolean;
}

export function Section({ title, description, action, as = 'h2', divided = false, className, children, ...props }: SectionProps) {
  const id = React.useId();
  const Heading = as;
  return (
    <section
      aria-labelledby={title ? id : undefined}
      className={cn('flex flex-col gap-space-5', divided && 'border-t border-line pt-space-6', className)}
      {...props}
    >
      {title || action ? (
        <header className="flex flex-wrap items-start justify-between gap-space-4">
          <div className="flex min-w-[min(16rem,100%)] flex-1 flex-col gap-space-1">
            {title ? (
              <Heading id={id} className={cn('m-0 font-display text-ink', as === 'h2' ? 'text-heading-2' : 'text-heading-3')}>
                {title}
              </Heading>
            ) : null}
            {description ? <p className="m-0 max-w-texto text-body text-ink-muted">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
