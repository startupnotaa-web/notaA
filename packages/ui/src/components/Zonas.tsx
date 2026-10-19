'use client';
import * as React from 'react';
import { PanelRight } from 'lucide-react';
import { Button } from './Button';
import { SidePanel } from './SidePanel';

export interface ZonasProps {
  /** Zona principal: o trabalho da tela. */
  principal: React.ReactNode;
  /** Zona de contexto e ações (resumo, atalhos, filtros). */
  contexto: React.ReactNode;
  /** Nome da zona de contexto, usado na região e no drawer. */
  tituloContexto?: string;
}

/**
 * Principal + contexto. A partir de 1.280px as duas ficam lado a lado (com a navegação, são as 3 zonas).
 * Abaixo de 1.280px o contexto vira um drawer aberto por um botão: 2 zonas, sem perder nada.
 */
export function Zonas({ principal, contexto, tituloContexto = 'Resumo e ações' }: ZonasProps) {
  const [aberto, setAberto] = React.useState(false);
  return (
    <div className="grid gap-gutter xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
      <div className="flex min-w-0 flex-col gap-space-5">
        <div className="flex justify-end xl:hidden">
          <Button variant="secondary" onClick={() => setAberto(true)} aria-haspopup="dialog">
            <PanelRight aria-hidden="true" className="h-5 w-5" />
            {tituloContexto}
          </Button>
        </div>
        {principal}
      </div>
      <aside aria-label={tituloContexto} className="hidden min-w-0 xl:block">
        <div className="sticky top-space-5 flex flex-col gap-space-5">{contexto}</div>
      </aside>
      <SidePanel open={aberto} onClose={() => setAberto(false)} title={tituloContexto}>
        <div className="flex flex-col gap-space-5">{contexto}</div>
      </SidePanel>
    </div>
  );
}
