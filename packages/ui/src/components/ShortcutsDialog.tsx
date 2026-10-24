'use client';
import * as React from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

export interface GrupoDeAtalhos {
  titulo: string;
  itens: { teclas: string[]; descricao: string }[];
}

export interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
  grupos: GrupoDeAtalhos[];
}

/** Painel "Atalhos" (tecla ?): lista os atalhos do aplicativo, agrupados. */
export function ShortcutsDialog({ open, onClose, grupos }: ShortcutsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Atalhos de teclado"
      description="Disponíveis no computador. Os atalhos de uma tecla só funcionam fora de campos de texto."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="flex flex-col gap-space-5">
        {grupos.map((g) => (
          <section key={g.titulo} aria-label={g.titulo} className="flex flex-col gap-space-2">
            <h3 className="m-0 font-display text-label text-ink-muted">{g.titulo}</h3>
            <dl className="m-0 flex flex-col">
              {g.itens.map((i) => (
                <div key={i.descricao} className="flex items-center justify-between gap-space-4 border-b border-line py-space-2 last:border-b-0">
                  <dt className="text-body-sm text-ink">{i.descricao}</dt>
                  <dd className="m-0 flex flex-none gap-space-1">
                    {i.teclas.map((t) => (
                      <kbd key={t} className="rounded-sm border border-line-strong bg-surface-sunken px-2 py-0.5 font-text text-caption font-bold text-ink">
                        {t}
                      </kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
