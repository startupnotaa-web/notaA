// Linha de ação: o que precisa de você, sem cartão. Status à esquerda, título e texto no meio,
// ação à direita, separada da próxima por uma linha fina. Use dentro de um <ul role="list"> ou <div>.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface ActionRowProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Marcador de status (um Chip). */
  status?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Ação da linha (um Button ou ButtonLink). */
  action?: React.ReactNode;
  /** Elemento raiz. Padrão: li. */
  as?: 'li' | 'div';
}

export function ActionRow({ status, title, description, action, as = 'li', className, ...props }: ActionRowProps) {
  const Raiz = as;
  return (
    <Raiz
      className={cn(
        'flex flex-wrap items-center gap-x-space-5 gap-y-space-3 border-b border-line py-space-4 first:pt-0 last:border-b-0 last:pb-0',
        className,
      )}
      {...props}
    >
      {status ? <div className="shrink-0">{status}</div> : null}
      <div className="flex min-w-[min(14rem,100%)] flex-1 flex-col gap-space-1">
        <strong className="text-body font-bold text-ink">{title}</strong>
        {description ? <span className="text-body-sm text-ink-muted">{description}</span> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </Raiz>
  );
}
