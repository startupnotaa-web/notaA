// docs/07 §5 — Tabela de dados. Rola na horizontal dentro do próprio contêiner
// (a página nunca rola de lado) e dá às células o espaçamento e a cor padrão.
// Use <th scope="col"> no cabeçalho; a legenda (`caption`) nomeia a tabela.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  caption?: React.ReactNode;
  /** Legenda só para leitor de tela (quando o título já está visível acima). */
  captionOculta?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(function Table(
  { caption, captionOculta = false, className, children, ...props },
  ref,
) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      <table
        ref={ref}
        className={cn(
          'w-full border-collapse text-left text-sm',
          '[&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-text-muted',
          '[&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
          className,
        )}
        {...props}
      >
        {caption ? (
          <caption className={cn('p-3 text-left text-sm text-text-muted', captionOculta && 'sr-only')}>
            {caption}
          </caption>
        ) : null}
        {children}
      </table>
    </div>
  );
});
