// Faixa de resumo: poucos números lado a lado, separados por uma linha fina (sem um cartão por número).
// Em tela estreita empilha. Os valores usam Sora com algarismos tabulares.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface SummaryItem {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  /** Chip ou texto curto abaixo do valor. */
  hint?: React.ReactNode;
}

export interface SummaryStripProps extends React.HTMLAttributes<HTMLDListElement> {
  items: SummaryItem[];
}

const colunas: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

export function SummaryStrip({ items, className, ...props }: SummaryStripProps) {
  return (
    <dl
      className={cn(
        'm-0 grid grid-cols-1 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface',
        'sm:divide-y-0 sm:divide-x',
        colunas[Math.min(Math.max(items.length, 1), 4)],
        className,
      )}
      {...props}
    >
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-space-1 p-space-5">
          <dt className="text-label text-ink-muted">{item.label}</dt>
          <dd className="m-0 font-display text-figure tabular-nums text-ink">{item.value}</dd>
          {item.hint ? <dd className="m-0 text-body-sm text-ink-muted">{item.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
