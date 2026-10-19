'use client';
import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { EASE_OUT, FOCO } from '../lib/foco';
import { teclaModificadora } from '../lib/atalhos';

export interface TopBarProps {
  /** À esquerda: a marca (quando não há SideNav) e o seletor de contexto. */
  esquerda?: React.ReactNode;
  /** Abre a paleta de comandos. Sem isto, a barra não mostra o campo de busca. */
  aoBuscar?: () => void;
  /** Texto do campo de busca. */
  placeholderBusca?: string;
  /** À direita, antes da conta: ajuda e atalhos. */
  acoes?: React.ReactNode;
  /** À direita: o menu da conta. */
  conta?: React.ReactNode;
  className?: string;
}

/** Barra superior do aplicativo: contexto, busca global (Ctrl/Cmd+K), ajuda e conta. 56px, sem rolar. */
export function TopBar({ esquerda, aoBuscar, placeholderBusca = 'Buscar telas e ações', acoes, conta, className }: TopBarProps) {
  const [tecla, setTecla] = React.useState('Ctrl');
  React.useEffect(() => setTecla(teclaModificadora()), []);
  return (
    <header className={cn('flex h-topbar shrink-0 items-center gap-space-4 border-b border-line bg-surface px-4 lg:px-space-5', className)}>
      <div className="flex min-w-0 items-center gap-space-3">{esquerda}</div>
      {aoBuscar ? (
        <button
          type="button"
          onClick={aoBuscar}
          aria-label={`${placeholderBusca} (${tecla} K)`}
          aria-keyshortcuts="Control+K Meta+K"
          className={cn(
            'mx-auto flex min-h-[44px] w-full max-w-xl items-center gap-space-3 rounded-md border border-line-strong bg-paper px-space-3 text-left font-text text-body-sm text-ink-muted',
            `transition-colors duration-fast ${EASE_OUT}`,
            FOCO,
            'hover:bg-surface-sunken',
          )}
        >
          <Search aria-hidden="true" className="h-4 w-4 flex-none" />
          <span className="flex-1 truncate max-md:sr-only">{placeholderBusca}</span>
          <kbd className="hidden flex-none rounded-sm border border-line bg-surface px-1.5 py-0.5 font-text text-caption font-bold text-ink-muted md:inline">
            {tecla} K
          </kbd>
        </button>
      ) : (
        <div className="flex-1" />
      )}
      <div className="flex flex-none items-center gap-space-2">
        {acoes}
        {conta}
      </div>
    </header>
  );
}
