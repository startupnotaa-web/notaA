'use client';
// Paleta de comandos (Ctrl/Cmd+K): campo de busca + lista, no padrão combobox com listbox.
// A busca é local, sobre os itens recebidos (telas e ações do aplicativo); sem acento e sem caixa.
import * as React from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { focaveisEm } from '../lib/focaveis';

export interface ComandoItem {
  id: string;
  rotulo: string;
  /** Grupo do item na lista (ex.: "Ir para", "Ações"). */
  grupo?: string;
  /** Texto de apoio à direita (ex.: um atalho ou a seção). */
  dica?: string;
  icone?: React.ReactNode;
  /** Palavras extras que também encontram o item. */
  palavras?: string[];
  aoSelecionar: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  itens: ComandoItem[];
  placeholder?: string;
  /** Nome acessível do diálogo. */
  titulo?: string;
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

export function CommandPalette({ open, onClose, itens, placeholder = 'Buscar telas e ações…', titulo = 'Buscar' }: CommandPaletteProps) {
  const id = React.useId();
  const [consulta, setConsulta] = React.useState('');
  const [ativo, setAtivo] = React.useState(0);
  const painel = React.useRef<HTMLDivElement>(null);
  const campo = React.useRef<HTMLInputElement>(null);
  const aoFechar = React.useRef(onClose);
  aoFechar.current = onClose;

  const filtrados = React.useMemo(() => {
    const q = normalizar(consulta.trim());
    if (!q) return itens;
    return itens.filter((i) => normalizar([i.rotulo, i.grupo ?? '', ...(i.palavras ?? [])].join(' ')).includes(q));
  }, [itens, consulta]);

  React.useEffect(() => {
    if (!open) return;
    setConsulta('');
    setAtivo(0);
    const abriu = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    campo.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (abriu?.isConnected) abriu.focus();
    };
  }, [open]);

  React.useEffect(() => setAtivo(0), [consulta]);

  React.useEffect(() => {
    if (!open) return;
    document.getElementById(`${id}-op-${ativo}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [ativo, open, id]);

  if (!open || typeof document === 'undefined') return null;

  const escolher = (item: ComandoItem | undefined) => {
    if (!item) return;
    aoFechar.current();
    item.aoSelecionar();
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      aoFechar.current();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAtivo((a) => (filtrados.length ? (a + 1) % filtrados.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAtivo((a) => (filtrados.length ? (a - 1 + filtrados.length) % filtrados.length : 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setAtivo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setAtivo(Math.max(0, filtrados.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      escolher(filtrados[ativo]);
    } else if (e.key === 'Tab') {
      // O foco fica no campo: a navegação da lista é por setas.
      const itensFocaveis = painel.current ? focaveisEm(painel.current) : [];
      if (itensFocaveis.length <= 1) e.preventDefault();
    }
  };

  let grupoAnterior: string | undefined;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" onKeyDown={aoTeclar}>
      <div
        aria-hidden="true"
        data-testid="paleta-scrim"
        onClick={() => aoFechar.current()}
        className="absolute inset-0 bg-scrim animate-[na-fade-in_240ms_var(--ease-out)] motion-reduce:animate-none"
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative flex max-h-[70vh] w-full max-w-[640px] flex-col overflow-hidden rounded-lg border border-line bg-surface text-ink shadow-raise animate-[na-rise-in_240ms_var(--ease-out)] motion-reduce:animate-none"
      >
        <div className="flex items-center gap-3 border-b border-line px-space-4">
          <Search aria-hidden="true" className="h-5 w-5 flex-none text-ink-muted" />
          <input
            ref={campo}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-lista`}
            aria-activedescendant={filtrados.length ? `${id}-op-${ativo}` : undefined}
            aria-autocomplete="list"
            aria-label={titulo}
            autoComplete="off"
            spellCheck={false}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder={placeholder}
            className="min-h-[52px] flex-1 bg-transparent font-text text-body text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
        <ul id={`${id}-lista`} role="listbox" aria-label="Resultados" className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-space-2">
          {filtrados.length === 0 ? (
            <li role="presentation" className="px-space-3 py-space-5 text-body-sm text-ink-muted">
              Nada encontrado para “{consulta}”.
            </li>
          ) : (
            filtrados.map((item, i) => {
              const cabecalho = item.grupo && item.grupo !== grupoAnterior ? item.grupo : null;
              grupoAnterior = item.grupo;
              return (
                <React.Fragment key={item.id}>
                  {cabecalho ? (
                    <li role="presentation" className="px-space-3 pb-1 pt-space-3 font-text text-caption text-ink-muted">
                      {cabecalho}
                    </li>
                  ) : null}
                  <li
                    id={`${id}-op-${i}`}
                    role="option"
                    aria-selected={i === ativo}
                    onMouseMove={() => setAtivo(i)}
                    onClick={() => escolher(item)}
                    className={cn(
                      'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-space-3 font-text text-body-sm',
                      i === ativo ? 'bg-violet-tint text-primary' : 'text-ink',
                    )}
                  >
                    {item.icone ? (
                      <span aria-hidden="true" className="inline-flex h-5 w-5 flex-none items-center justify-center">
                        {item.icone}
                      </span>
                    ) : null}
                    <span className="flex-1 font-bold">{item.rotulo}</span>
                    {item.dica ? <span className="text-caption text-ink-muted">{item.dica}</span> : null}
                  </li>
                </React.Fragment>
              );
            })
          )}
        </ul>
        <p className="m-0 flex flex-wrap gap-x-space-4 border-t border-line px-space-4 py-space-2 text-caption text-ink-muted">
          <span>↑ ↓ navegar</span>
          <span>Enter abrir</span>
          <span>Esc fechar</span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
