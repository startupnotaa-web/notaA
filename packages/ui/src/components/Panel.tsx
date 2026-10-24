// Painel: o único contêiner com borda e fundo. Use só quando agrupa um formulário ou uma tabela;
// para o resto, use Section. Sem sombra (sombra é só do que flutua).
import * as React from 'react';
import { cn } from '../lib/cn';

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Nível semântico do título. */
  as?: 'h2' | 'h3';
  /** Sem padding interno: para tabelas que vão de borda a borda. */
  flush?: boolean;
}

export function Panel({ title, description, action, as = 'h2', flush = false, className, children, ...props }: PanelProps) {
  const id = React.useId();
  const Heading = as;
  return (
    <section
      aria-labelledby={title ? id : undefined}
      className={cn('overflow-hidden rounded-lg border border-line bg-surface', className)}
      {...props}
    >
      {title || action ? (
        <header className="flex flex-wrap items-start justify-between gap-space-4 p-space-5 pb-0">
          <div className="flex min-w-[min(16rem,100%)] flex-1 flex-col gap-space-1">
            {title ? (
              <Heading id={id} className="m-0 font-display text-heading-3 text-ink">
                {title}
              </Heading>
            ) : null}
            {description ? <p className="m-0 max-w-texto text-body-sm text-ink-muted">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn(!flush && 'p-space-5', flush && Boolean(title) && 'pt-space-4')}>{children}</div>
    </section>
  );
}
