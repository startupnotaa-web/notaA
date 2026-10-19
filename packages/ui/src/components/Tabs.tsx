'use client';
import * as React from 'react';
import { cn } from '../lib/cn';
import { EASE_OUT, FOCO } from '../lib/foco';

export interface TabsProps {
  tabs: { id: string; label: React.ReactNode; count?: number }[];
  /** Nome acessível do grupo de abas. */
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  /**
   * Liga cada aba ao seu painel (aria-controls). O painel usa `propsDoPainel(idBase, id)`.
   * Sem `idBase`, as abas funcionam, mas não apontam para um painel.
   */
  idBase?: string;
}

export const idDaAba = (idBase: string, id: string) => `${idBase}-aba-${id}`;
export const idDoPainel = (idBase: string, id: string) => `${idBase}-painel-${id}`;

/** Props para o elemento de painel que acompanha a aba `id`. */
export function propsDoPainel(idBase: string, id: string) {
  return { role: 'tabpanel' as const, id: idDoPainel(idBase, id), 'aria-labelledby': idDaAba(idBase, id), tabIndex: 0 };
}

export function Tabs({ tabs, label, value, defaultValue, onChange, idBase }: TabsProps) {
  const [interno, setInterno] = React.useState(defaultValue ?? tabs[0]?.id);
  const atual = value ?? interno;
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const escolher = (id: string, moverFoco: boolean) => {
    setInterno(id);
    onChange?.(id);
    if (moverFoco) refs.current[id]?.focus();
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    const n = tabs.length;
    const i = tabs.findIndex((t) => t.id === atual);
    let alvo: number | null = null;
    if (e.key === 'ArrowRight') alvo = (i + 1) % n;
    else if (e.key === 'ArrowLeft') alvo = (i - 1 + n) % n;
    else if (e.key === 'Home') alvo = 0;
    else if (e.key === 'End') alvo = n - 1;
    if (alvo === null) return;
    e.preventDefault();
    const proxima = tabs[alvo];
    if (proxima) escolher(proxima.id, true);
  };

  return (
    <div role="tablist" aria-label={label} onKeyDown={aoTeclar} className="flex gap-space-2 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const ativa = t.id === atual;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={idBase ? idDaAba(idBase, t.id) : undefined}
            aria-controls={idBase ? idDoPainel(idBase, t.id) : undefined}
            aria-selected={ativa}
            tabIndex={ativa ? 0 : -1}
            onClick={() => escolher(t.id, false)}
            className={cn(
              'relative min-h-[44px] shrink-0 whitespace-nowrap rounded-t-sm px-4 py-3 font-text text-label',
              `transition-colors duration-fast ${EASE_OUT}`,
              FOCO,
              ativa
                ? "text-primary after:absolute after:inset-x-4 after:bottom-0 after:h-[2px] after:rounded-t-[2px] after:bg-primary after:content-['']"
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
            {t.count != null ? (
              <span className="ml-2 rounded-pill bg-surface-sunken px-2 text-caption font-normal text-ink-muted">
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
