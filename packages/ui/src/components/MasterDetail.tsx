'use client';
import * as React from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './Button';

export interface MasterDetailProps {
  /** Lista (à esquerda). */
  lista: React.ReactNode;
  /** Detalhe do item escolhido (à direita). `null` mostra `vazio`. */
  detalhe: React.ReactNode | null;
  /** O que a zona de detalhe mostra sem seleção. */
  vazio?: React.ReactNode;
  /** Chamado pelo botão Voltar, que só aparece abaixo de 1.024px (lista e detalhe se alternam). */
  aoVoltar?: () => void;
  /** Largura da lista a partir de 1.024px. */
  larguraLista?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LISTA = {
  sm: 'lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]',
  md: 'lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]',
  lg: 'lg:grid-cols-[minmax(400px,520px)_minmax(0,1fr)]',
} as const;

/**
 * Lista à esquerda e detalhe à direita. Cada zona rola por dentro, então ocupe uma altura definida
 * (`h-full` num pai com altura, ou `min-h-[...]`). Abaixo de 1.024px mostra uma zona por vez.
 */
export function MasterDetail({ lista, detalhe, vazio, aoVoltar, larguraLista = 'md', className }: MasterDetailProps) {
  const temDetalhe = detalhe !== null && detalhe !== undefined;
  return (
    <div className={cn('grid h-full min-h-0 gap-gutter', LISTA[larguraLista], className)}>
      <section aria-label="Lista" className={cn('min-h-0 min-w-0 overflow-y-auto', temDetalhe && 'max-lg:hidden')}>
        {lista}
      </section>
      <section aria-label="Detalhe" className={cn('min-h-0 min-w-0 overflow-y-auto rounded-lg border border-line bg-surface', !temDetalhe && 'max-lg:hidden')}>
        {temDetalhe && aoVoltar ? (
          <div className="p-space-3 lg:hidden">
            <Button variant="quiet" onClick={aoVoltar}>
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              Voltar à lista
            </Button>
          </div>
        ) : null}
        {temDetalhe ? detalhe : <div className="flex h-full items-center justify-center p-space-6 text-body text-ink-muted">{vazio}</div>}
      </section>
    </div>
  );
}
