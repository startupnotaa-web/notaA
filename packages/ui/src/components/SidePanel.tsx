'use client';
// Painel lateral deslizante (drawer): detalhe, edição rápida ou o contexto de uma tela, sem trocar de página.
// Modal: prende o foco, fecha com Esc e no clique no véu, e devolve o foco a quem o abriu. Entra em 240ms.
import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';
import { EASE_OUT, FOCO } from '../lib/foco';
import { focaveisEm } from '../lib/focaveis';

export interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  /** Título; é o nome acessível. */
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Botões de ação, fixos no pé do painel. */
  footer?: React.ReactNode;
  largura?: 'md' | 'lg';
  className?: string;
}

const LARGURAS = { md: 'max-w-[440px]', lg: 'max-w-[640px]' } as const;

export function SidePanel({ open, onClose, title, description, children, footer, largura = 'md', className }: SidePanelProps) {
  const id = React.useId();
  const painel = React.useRef<HTMLDivElement>(null);
  const aoFechar = React.useRef(onClose);
  aoFechar.current = onClose;

  React.useEffect(() => {
    if (!open) return;
    const abriu = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const raiz = painel.current;
    if (!raiz) return;
    (focaveisEm(raiz)[0] ?? raiz).focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        aoFechar.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const itens = focaveisEm(raiz);
      if (itens.length === 0) {
        e.preventDefault();
        raiz.focus();
        return;
      }
      const primeiro = itens[0]!;
      const ultimo = itens[itens.length - 1]!;
      const ativo = document.activeElement;
      if (e.shiftKey && (ativo === primeiro || ativo === raiz || !raiz.contains(ativo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (ativo === ultimo || !raiz.contains(ativo))) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflow;
      if (abriu?.isConnected) abriu.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        aria-hidden="true"
        data-testid="painel-scrim"
        onClick={() => aoFechar.current()}
        className="absolute inset-0 bg-scrim animate-[na-fade-in_240ms_var(--ease-out)] motion-reduce:animate-none"
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={description ? `${id}-descricao` : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex h-full w-full flex-col border-l border-line bg-surface text-ink shadow-raise',
          'animate-[na-slide-in_240ms_var(--ease-out)] motion-reduce:animate-none',
          LARGURAS[largura],
          className,
        )}
      >
        <header className="flex items-start justify-between gap-space-4 border-b border-line p-space-5">
          <div className="flex min-w-0 flex-col gap-space-1">
            <h2 id={`${id}-titulo`} className="m-0 font-display text-heading-3">
              {title}
            </h2>
            {description ? (
              <p id={`${id}-descricao`} className="m-0 text-body-sm text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => aoFechar.current()}
            aria-label="Fechar painel"
            className={cn(
              '-m-space-2 inline-flex min-h-[44px] min-w-[44px] flex-none items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink',
              `transition-colors duration-fast ${EASE_OUT}`,
              FOCO,
            )}
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-space-5">{children}</div>
        {footer ? <footer className="flex flex-wrap justify-end gap-space-3 border-t border-line p-space-5">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
