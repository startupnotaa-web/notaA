'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@notaa/ui';
import { FOCO } from '../../_landing/componentes/estilos';

export interface RecursoDaEscola {
  id: string;
  rotulo: string;
  titulo: string;
  texto: string;
  itens: { texto: string; aviso?: ReactNode }[];
  /** Aviso no título da aba aberta, quando o recurso inteiro depende de confirmação. */
  avisoDoTitulo?: ReactNode;
}

/**
 * Cinco recursos em abas. São botões de alternância (`aria-pressed`), não `role="tab"`: funcionam com Tab e
 * Enter/Espaço, sem exigir setas, e o leitor de tela anuncia qual está ativo. O painel é uma região ligada à aba.
 */
export function AbasRecursos({ recursos }: { recursos: RecursoDaEscola[] }) {
  const [ativo, setAtivo] = useState(recursos[0]!.id);
  const atual = recursos.find((r) => r.id === ativo) ?? recursos[0]!;

  return (
    <>
      <div role="group" aria-label="Recursos da escola" className="mb-7 flex flex-wrap gap-2.5">
        {recursos.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={r.id === ativo}
            aria-controls="painel-recurso"
            onClick={() => setAtivo(r.id)}
            className={cn(
              'min-h-[48px] cursor-pointer rounded-sm border-[1.5px] px-5 font-text text-[15.5px] font-bold leading-[22px] transition-colors duration-fast ease-out motion-reduce:transition-none',
              r.id === ativo
                ? 'border-amb-navy bg-amb-navy text-amb-on-navy'
                : 'border-amb-line bg-amb-surface text-amb-ink hover:border-amb-accent',
              FOCO,
            )}
          >
            {r.rotulo}
          </button>
        ))}
      </div>
      <div
        id="painel-recurso"
        role="region"
        aria-label={atual.rotulo}
        className="flex flex-wrap gap-7 rounded-[16px] border border-amb-line bg-amb-surface p-6 md:p-10"
      >
        <div className="flex flex-[1_1_380px] flex-col gap-4">
          <h3 className="m-0 font-display text-[28px] font-semibold leading-9 text-amb-navy">
            {atual.titulo}
            {atual.avisoDoTitulo}
          </h3>
          <p className="m-0 max-w-[480px] text-[18px] leading-[29px] text-amb-ink-muted">{atual.texto}</p>
        </div>
        <ul className="m-0 flex flex-[1_1_320px] list-none flex-col self-center p-0">
          {atual.itens.map((i) => (
            <li key={i.texto} className="flex items-center gap-3.5 border-t border-amb-line py-4 text-[17px] font-bold leading-6">
              <span aria-hidden="true" className="h-[22px] w-[22px] shrink-0 rounded-[6px] bg-amb-accent" />
              <span>
                {i.texto}
                {i.aviso}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
