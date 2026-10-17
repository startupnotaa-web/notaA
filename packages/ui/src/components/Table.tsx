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
    // Região rolável: precisa de foco por teclado para quem não usa mouse conseguir rolar (WCAG 2.1.1).
    <div
      tabIndex={0}
      role={typeof caption === 'string' ? 'region' : undefined}
      aria-label={typeof caption === 'string' ? caption : undefined}
      className="w-full overflow-x-auto rounded-lg border border-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <table
        ref={ref}
        className={cn(
          'w-full border-collapse text-left text-sm',
          '[&_th]:bg-surface-sunken [&_th]:px-3 [&_th]:py-2 [&_th]:font-bold [&_th]:text-ink-muted',
          '[&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
          className,
        )}
        {...props}
      >
        {caption ? (
          <caption className={cn('p-3 text-left text-sm text-ink-muted', captionOculta && 'sr-only')}>
            {caption}
          </caption>
        ) : null}
        {children}
      </table>
    </div>
  );
});
