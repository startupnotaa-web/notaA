import * as React from 'react';
import { cn } from '../lib/cn';
import { EASE_OUT, FOCO } from '../lib/foco';

export interface BottomNavItem {
  id: string;
  label: string;
  href: string;
  /** Ícone de 20px; o rótulo fica sempre visível ao lado dele, nunca só o ícone. */
  icon: React.ReactNode;
}

export interface BottomNavProps {
  /** No máximo 5 destinos: mais que isso não cabe com alvo de 44px em 360px de largura. */
  items: BottomNavItem[];
  current?: string;
  label?: string;
  /** Componente de link (ex.: `next/link`). Padrão: `<a>`. */
  linkAs?: React.ElementType;
  /** Limita a largura do conteúdo (ex.: `max-w-4xl`) em telas largas. */
  innerClassName?: string;
}

const LIMITE = 5;

/** Navegação inferior fixa, para telas estreitas. Item atual em primary e com aria-current. */
export function BottomNav({ items, current, label = 'Principal', linkAs, innerClassName }: BottomNavProps) {
  const Link: React.ElementType = linkAs ?? 'a';
  if (items.length > LIMITE && process.env.NODE_ENV !== 'production') {
    console.error(`BottomNav aceita até ${LIMITE} destinos; recebeu ${items.length}. Mova o excedente para um Menu.`);
  }
  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface">
      <ul className={cn('mx-auto flex w-full list-none p-0', innerClassName)}>
        {items.slice(0, LIMITE).map((item) => {
          const ativo = item.id === current;
          return (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                aria-current={ativo ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] min-w-[44px] flex-col items-center justify-center gap-1 px-1 py-2 font-text text-caption font-bold no-underline',
                  `transition-colors duration-fast ${EASE_OUT}`,
                  FOCO,
                  ativo ? 'text-primary' : 'text-ink-muted hover:text-ink',
                )}
              >
                <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
