import * as React from 'react';
import { cn } from '../lib/cn';
import { EASE_OUT, FOCO } from '../lib/foco';

export type SideNavItem =
  | {
      id: string;
      label: React.ReactNode;
      href?: string;
      badge?: React.ReactNode;
      /** Ícone de 20px. Obrigatório para o modo `collapsible`, que mostra só ele entre 768 e 1.023px. */
      icon?: React.ReactNode;
    }
  | { group: string };

export interface SideNavProps {
  /** Itens de navegação; um item { group } vira título de grupo. */
  items: SideNavItem[];
  current?: string;
  /** Símbolo da marca, mostrado a 24px ao lado do nome: URL (nota-a-simbolo.svg) ou elemento (NotaASimbolo). */
  logo?: string | React.ReactNode;
  brand?: React.ReactNode;
  label?: string;
  /** Abaixo de 1.024px recolhe para só ícones (o texto fica para leitores de tela). */
  collapsible?: boolean;
  /** Componente de link (ex.: `next/link`). Padrão: `<a>`. Recebe `href` e `aria-current`. */
  linkAs?: React.ElementType;
  className?: string;
}

export function SideNav({
  items,
  current,
  logo,
  brand = 'Nota A',
  label = 'Principal',
  collapsible = false,
  linkAs,
  className,
}: SideNavProps) {
  const Link: React.ElementType = linkAs ?? 'a';
  const recolhe = collapsible;
  return (
    <nav
      aria-label={label}
      className={cn(
        'flex flex-col gap-1 border-r border-line bg-surface px-3 py-5',
        recolhe ? 'w-[72px] lg:w-[248px]' : 'w-[248px]',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-3 pb-5 font-display text-[17px] font-semibold leading-6 text-ink',
          recolhe && 'max-lg:justify-center max-lg:px-0',
        )}
      >
        {typeof logo === 'string' ? (
          <img src={logo} alt="" className="h-6 w-auto flex-none" />
        ) : (
          logo
        )}
        <span className={cn(recolhe && 'max-lg:sr-only')}>{brand}</span>
      </div>
      {items.map((item) => {
        if ('group' in item) {
          return (
            <div
              key={`g-${item.group}`}
              className={cn('px-3 pb-2 pt-4 font-text text-[12.5px] leading-[18px] text-ink-muted', recolhe && 'max-lg:sr-only')}
            >
              {item.group}
            </div>
          );
        }
        const ativo = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href ?? '#'}
            aria-current={ativo ? 'page' : undefined}
            title={recolhe && typeof item.label === 'string' ? item.label : undefined}
            className={cn(
              'flex min-h-[44px] items-center gap-3 rounded-sm px-3 font-text text-sm font-bold leading-5 no-underline',
              `transition-colors duration-fast ${EASE_OUT}`,
              FOCO,
              recolhe && 'max-lg:justify-center max-lg:px-0',
              ativo ? 'bg-violet-tint text-primary' : 'text-ink hover:bg-surface-sunken',
            )}
          >
            {item.icon ? (
              <span aria-hidden="true" className="inline-flex h-5 w-5 flex-none items-center justify-center">
                {item.icon}
              </span>
            ) : null}
            <span className={cn(recolhe && Boolean(item.icon) && 'max-lg:sr-only')}>{item.label}</span>
            {item.badge ? (
              <span
                className={cn(
                  'ml-auto min-w-[20px] rounded-pill bg-warning-tint px-1.5 text-center text-[12.5px] font-bold leading-5 text-warning',
                  recolhe && 'max-lg:sr-only',
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
