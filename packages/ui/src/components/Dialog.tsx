'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { focaveisEm } from '../lib/focaveis';

export interface DialogProps {
  open: boolean;
  /** Chamado por Esc, clique no véu (se `closeOnScrim`) e botões de dentro que peçam fechar. */
  onClose: () => void;
  /** Título do diálogo; é o nome acessível. */
  title: React.ReactNode;
  /** Texto de apoio, ligado por aria-describedby. */
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Botões de ação, alinhados à direita. A ação principal vai por último. */
  footer?: React.ReactNode;
  /** Clique no véu fecha. Desligue em diálogos com formulário em andamento. Padrão: true. */
  closeOnScrim?: boolean;
  className?: string;
}

/**
 * Diálogo modal. Prende o foco (Tab e Shift+Tab ciclam), fecha com Esc e devolve o foco a quem o abriu.
 * Entra em 420ms (duration-slow); sem movimento para quem pede prefers-reduced-motion.
 */
export function Dialog({ open, onClose, title, description, children, footer, closeOnScrim = true, className }: DialogProps) {
  const id = React.useId();
  const painel = React.useRef<HTMLDivElement>(null);
  const aoFechar = React.useRef(onClose);
  aoFechar.current = onClose;

  React.useEffect(() => {
    if (!open) return;
    const abriu = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const raiz = painel.current;
    if (!raiz) return;

    // Foco inicial: o primeiro controle; sem controles, o próprio painel.
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
      // Só devolve se o elemento ainda existe (a tela de trás pode ter mudado).
      if (abriu?.isConnected) abriu.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        data-testid="dialog-scrim"
        onClick={closeOnScrim ? () => aoFechar.current() : undefined}
        className="absolute inset-0 bg-[var(--scrim)] animate-[na-fade-in_240ms_var(--ease-out)] motion-reduce:animate-none"
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={description ? `${id}-descricao` : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[520px] flex-col gap-4 overflow-auto rounded-lg border border-line bg-surface p-5 text-ink shadow-raise',
          'animate-[na-rise-in_420ms_var(--ease-out)] motion-reduce:animate-none',
          className,
        )}
      >
        <h2 id={`${id}-titulo`} className="m-0 font-display text-[19px] font-semibold leading-[26px]">
          {title}
        </h2>
        {description ? (
          <p id={`${id}-descricao`} className="m-0 font-text text-base leading-[26px] text-ink-muted">
            {description}
          </p>
        ) : null}
        {children}
        {footer ? <div className="flex flex-wrap justify-end gap-3">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
