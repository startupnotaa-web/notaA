import * as React from 'react';
import { cn } from '../lib/cn';

export interface AppFrameProps {
  /** Barra lateral (SideNav). Aparece a partir de 768px; abaixo disso a navegação é a inferior. */
  nav?: React.ReactNode;
  /** Barra superior (TopBar). */
  topbar?: React.ReactNode;
  /** Navegação inferior, só abaixo de 768px (BottomNav). */
  bottomNav?: React.ReactNode;
  /** Nome do link "Pular para o conteúdo". */
  pularPara?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Estrutura de aplicativo: ocupa a altura da tela. A navegação e a barra superior ficam fixas; só a
 * área de trabalho (`main`) rola, por dentro. O conteúdo usa a largura toda; limite e centralização
 * ficam por conta de quem o compõe (ver `Pagina` no app e `max-w-pagina`).
 */
export function AppFrame({ nav, topbar, bottomNav, pularPara = 'Pular para o conteúdo', className, children }: AppFrameProps) {
  return (
    <div className={cn('flex h-dvh overflow-hidden bg-paper text-ink', className)}>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:font-bold focus:text-primary"
      >
        {pularPara}
      </a>
      {nav ? <div className="hidden h-full shrink-0 md:block">{nav}</div> : null}
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <main id="conteudo" tabIndex={-1} className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain focus:outline-none',
            // A navegação inferior é fixa e cobriria o fim da página.
            bottomNav ? 'pb-[72px] md:pb-0' : null,
          )}>
          {children}
        </main>
        {bottomNav ? <div className="md:hidden">{bottomNav}</div> : null}
      </div>
    </div>
  );
}
