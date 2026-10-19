'use client';
import * as React from 'react';
import { cn } from '../lib/cn';
import { EASE_OUT, FOCO } from '../lib/foco';
import { Button, type ButtonSize, type ButtonVariant } from './Button';

export interface MenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  /** `danger` para ações destrutivas: o texto vai em danger. */
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export interface MenuProps {
  /** Conteúdo do botão que abre o menu. */
  label: React.ReactNode;
  /** Obrigatório quando `label` é só um ícone. */
  ariaLabel?: string;
  items: MenuItem[];
  align?: 'start' | 'end';
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * Menu de ações (WAI-ARIA menu button). Setas, Home, End e busca pela inicial movem o foco; Esc fecha
 * e devolve o foco ao botão; clicar fora fecha. Abre em 240ms. Não reposiciona nas bordas da tela:
 * use `align="end"` para menus junto da margem direita.
 */
export function Menu({ label, ariaLabel, items, align = 'start', variant = 'secondary', size = 'md', className }: MenuProps) {
  const id = React.useId();
  const [aberto, setAberto] = React.useState(false);
  const raiz = React.useRef<HTMLDivElement>(null);
  const botao = React.useRef<HTMLButtonElement>(null);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const busca = React.useRef({ texto: '', timer: 0 as unknown as ReturnType<typeof setTimeout> });

  const habilitados = items.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0);

  const abrir = (foco: 'primeiro' | 'ultimo') => {
    setAberto(true);
    const alvo = foco === 'primeiro' ? habilitados[0] : habilitados[habilitados.length - 1];
    // O menu só existe no DOM depois do render; o foco vai no efeito abaixo.
    pendente.current = alvo ?? null;
  };
  const pendente = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (aberto && pendente.current !== null) {
      refs.current[pendente.current]?.focus();
      pendente.current = null;
    }
  }, [aberto]);

  const fechar = (devolverFoco: boolean) => {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  };

  // Clicar ou tocar fora fecha, sem roubar o foco de onde a pessoa clicou.
  React.useEffect(() => {
    if (!aberto) return;
    const aoPressionar = (e: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('pointerdown', aoPressionar);
    return () => document.removeEventListener('pointerdown', aoPressionar);
  }, [aberto]);

  const mover = (de: number, passo: 1 | -1) => {
    const pos = habilitados.indexOf(de);
    const alvo = habilitados[(pos + passo + habilitados.length) % habilitados.length];
    if (alvo !== undefined) refs.current[alvo]?.focus();
  };

  const aoTeclarNoBotao = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      abrir('primeiro');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      abrir('ultimo');
    }
  };

  const aoTeclarNoItem = (e: React.KeyboardEvent, i: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        mover(i, 1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        mover(i, -1);
        return;
      case 'Home':
        e.preventDefault();
        refs.current[habilitados[0]!]?.focus();
        return;
      case 'End':
        e.preventDefault();
        refs.current[habilitados[habilitados.length - 1]!]?.focus();
        return;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        fechar(true);
        return;
      case 'Tab':
        // Tab sai do menu e segue a ordem natural; só fecha, sem devolver o foco ao botão.
        setAberto(false);
        return;
    }
    // Busca pela inicial: letras seguidas em até 600ms formam o prefixo.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      clearTimeout(busca.current.timer);
      busca.current.texto += e.key.toLocaleLowerCase('pt-BR');
      busca.current.timer = setTimeout(() => (busca.current.texto = ''), 600);
      const alvo = habilitados.find((idx) => items[idx]!.label.toLocaleLowerCase('pt-BR').startsWith(busca.current.texto));
      if (alvo !== undefined) refs.current[alvo]?.focus();
    }
  };

  return (
    <div ref={raiz} className={cn('relative inline-block', className)}>
      <Button
        ref={botao}
        variant={variant}
        size={size}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? `${id}-menu` : undefined}
        aria-label={ariaLabel}
        id={`${id}-botao`}
        onClick={() => (aberto ? fechar(false) : abrir('primeiro'))}
        onKeyDown={aoTeclarNoBotao}
      >
        {label}
      </Button>
      {aberto ? (
        <div
          id={`${id}-menu`}
          role="menu"
          aria-labelledby={`${id}-botao`}
          className={cn(
            'absolute z-40 mt-2 flex min-w-[200px] flex-col rounded-md border border-line bg-surface p-1 shadow-raise',
            'animate-[na-rise-in_240ms_var(--ease-out)] motion-reduce:animate-none',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              onKeyDown={(e) => aoTeclarNoItem(e, i)}
              onClick={() => {
                fechar(true);
                item.onSelect();
              }}
              className={cn(
                'min-h-[44px] rounded-sm px-3 text-left font-text text-label',
                `transition-colors duration-fast ${EASE_OUT}`,
                'disabled:cursor-not-allowed disabled:opacity-50',
                FOCO,
                item.tone === 'danger' ? 'text-danger hover:bg-danger-tint' : 'text-ink hover:bg-surface-sunken',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
