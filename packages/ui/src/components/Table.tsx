// docs/07 §5 — Tabela de dados. Rola na horizontal dentro do próprio contêiner
// (a página nunca rola de lado) e dá às células o espaçamento e a cor padrão.
// `semContorno` tira a borda e o raio quando a tabela já mora num Panel.
// Use <th scope="col"> no cabeçalho; a legenda (`caption`) nomeia a tabela.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  caption?: React.ReactNode;
  /** Legenda só para leitor de tela (quando o título já está visível acima). */
  captionOculta?: boolean;
  /** Sem borda nem raio no contêiner (a tabela já está dentro de um Panel). */
  semContorno?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(function Table(
  { caption, captionOculta = false, semContorno = false, className, children, ...props },
  ref,
) {
  return (
    // Região rolável: precisa de foco por teclado para quem não usa mouse conseguir rolar (WCAG 2.1.1).
    <div
      tabIndex={0}
      role={typeof caption === 'string' ? 'region' : undefined}
      aria-label={typeof caption === 'string' ? caption : undefined}
      // `relative` prende ao wrapper os filhos absolutos (sr-only), que senão escapam do overflow e alargam a página.
      className={cn(
        'relative w-full overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        !semContorno && 'rounded-lg border border-line',
      )}
    >
      <table
        ref={ref}
        className={cn(
          'w-full border-collapse text-left text-body-sm',
          '[&_th]:bg-surface-sunken [&_th]:px-space-4 [&_th]:py-3 [&_th]:font-bold [&_th]:text-ink-muted',
          '[&_td]:border-t [&_td]:border-line [&_td]:px-space-4 [&_td]:py-3 [&_td]:align-top',
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
