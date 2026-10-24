import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/cn';
import { EASE_OUT, FOCO } from '../lib/foco';

export interface BreadcrumbItem {
  rotulo: string;
  /** Sem href, é a página atual. */
  href?: string;
}

export interface BreadcrumbsProps {
  itens: BreadcrumbItem[];
  /** Componente de link (ex.: `next/link`). Padrão: `<a>`. */
  linkAs?: React.ElementType;
  label?: string;
  className?: string;
}

/** Trilha de navegação. O último item é a página atual (aria-current="page"). */
export function Breadcrumbs({ itens, linkAs, label = 'Você está em', className }: BreadcrumbsProps) {
  const Link: React.ElementType = linkAs ?? 'a';
  return (
    <nav aria-label={label} className={className}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-space-1 p-0 font-text text-body-sm">
        {itens.map((item, i) => {
          const ultimo = i === itens.length - 1;
          return (
            <li key={`${item.rotulo}-${i}`} className="flex items-center gap-space-1">
              {item.href && !ultimo ? (
                <Link
                  href={item.href}
                  className={cn(
                    'rounded-sm px-1 text-ink-muted underline-offset-4 hover:text-ink hover:underline',
                    `transition-colors duration-fast ${EASE_OUT}`,
                    FOCO,
                  )}
                >
                  {item.rotulo}
                </Link>
              ) : (
                <span aria-current={ultimo ? 'page' : undefined} className={cn('px-1', ultimo ? 'font-bold text-ink' : 'text-ink-muted')}>
                  {item.rotulo}
                </span>
              )}
              {ultimo ? null : <ChevronRight aria-hidden="true" className="h-4 w-4 flex-none text-ink-muted" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
