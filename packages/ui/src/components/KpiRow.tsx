import * as React from 'react';
import { cn } from '../lib/cn';
import { Chip, type Tone } from './Chip';

export interface KpiItem {
  id: string;
  rotulo: React.ReactNode;
  valor: React.ReactNode;
  /** Variação ou situação, sempre em palavras ("+4 esta semana"). */
  variacao?: { texto: string; tom?: Tone };
  dica?: React.ReactNode;
}

export interface KpiRowProps extends React.HTMLAttributes<HTMLDListElement> {
  itens: KpiItem[];
}

const colunas: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
  5: 'sm:grid-cols-2 xl:grid-cols-5',
  6: 'sm:grid-cols-3 xl:grid-cols-6',
};

/** Indicadores em linha, para a primeira dobra de um painel. Uma única faixa, com divisórias de 1px. */
export function KpiRow({ itens, className, ...props }: KpiRowProps) {
  return (
    <dl
      className={cn(
        'm-0 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line',
        colunas[Math.min(Math.max(itens.length, 1), 6)],
        className,
      )}
      {...props}
    >
      {itens.map((k) => (
        <div key={k.id} className="flex min-w-0 flex-col gap-space-1 bg-surface p-space-4 lg:p-space-5">
          <dt className="text-label text-ink-muted">{k.rotulo}</dt>
          <dd className="m-0 truncate font-display text-figure tabular-nums text-ink">{k.valor}</dd>
          {k.variacao ? (
            <dd className="m-0">
              <Chip tone={k.variacao.tom ?? 'neutral'}>{k.variacao.texto}</Chip>
            </dd>
          ) : null}
          {k.dica ? <dd className="m-0 text-body-sm text-ink-muted">{k.dica}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
