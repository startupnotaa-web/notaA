import * as React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  /** Conteúdo fixo no pé da barra (ex.: o botão Sair). Fica visível também no modo recolhido. */
  footer?: React.ReactNode;
  /** Força o modo só de ícones em qualquer largura (escolha da pessoa). Com `onRecolher`, a barra mostra o botão de recolher e expandir. */
  recolhida?: boolean;
  onRecolher?: () => void;
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
  footer,
  recolhida = false,
  onRecolher,
  collapsible = false,
  linkAs,
  className,
}: SideNavProps) {
  const Link: React.ElementType = linkAs ?? 'a';
  // `recolhida` vale em todas as larguras; `collapsible` só abaixo de 1.024px.
  const recolhe = collapsible || recolhida;
  const rotuloOculto = recolhida ? 'sr-only' : 'max-lg:sr-only';
  const centraliza = recolhida ? 'justify-center px-0' : 'max-lg:justify-center max-lg:px-0';
  return (
    <nav
      aria-label={label}
      className={cn(
        'flex flex-col gap-1 border-r border-line bg-surface px-3 py-space-5',
        recolhida ? 'w-sidenav-recolhida' : recolhe ? 'w-sidenav-recolhida lg:w-sidenav' : 'w-sidenav',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-3 pb-space-5 font-display text-[17px] font-semibold leading-6 text-ink',
          recolhe && centraliza,
        )}
      >
        {typeof logo === 'string' ? (
          <img src={logo} alt="" className="h-6 w-auto flex-none" />
        ) : (
          logo
        )}
        <span className={cn(recolhe && rotuloOculto)}>{brand}</span>
      </div>
      {items.map((item) => {
        if ('group' in item) {
          return (
            <div
              key={`g-${item.group}`}
              className={cn('px-3 pb-2 pt-4 font-text text-caption text-ink-muted', recolhe && rotuloOculto)}
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
              'flex min-h-[44px] items-center gap-3 rounded-md px-3 font-text text-label no-underline',
              `transition-colors duration-fast ${EASE_OUT}`,
              FOCO,
              recolhe && centraliza,
              ativo ? 'bg-violet-tint text-primary' : 'text-ink hover:bg-surface-sunken',
            )}
          >
            {item.icon ? (
              <span aria-hidden="true" className="inline-flex h-5 w-5 flex-none items-center justify-center">
                {item.icon}
              </span>
            ) : null}
            <span className={cn(recolhe && Boolean(item.icon) && rotuloOculto)}>{item.label}</span>
            {item.badge ? (
              <span
                className={cn(
                  'ml-auto min-w-[20px] rounded-pill bg-warning-tint px-1.5 text-center text-caption font-bold text-warning',
                  recolhe && rotuloOculto,
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
      {footer || onRecolher ? (
        <div className="mt-auto flex flex-col gap-1 border-t border-line pt-space-4">
          {footer}
          {onRecolher ? (
            <button
              type="button"
              onClick={onRecolher}
              aria-pressed={recolhida}
              className={cn(
                'hidden min-h-[44px] items-center gap-3 rounded-md px-3 font-text text-label text-ink-muted lg:flex',
                `transition-colors duration-fast ${EASE_OUT}`,
                FOCO,
                'hover:bg-surface-sunken hover:text-ink',
                recolhida && 'justify-center px-0',
              )}
            >
              {recolhida ? <PanelLeftOpen aria-hidden="true" className="h-5 w-5" /> : <PanelLeftClose aria-hidden="true" className="h-5 w-5" />}
              <span className={cn(recolhida && 'sr-only')}>{recolhida ? 'Expandir menu' : 'Recolher menu'}</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
