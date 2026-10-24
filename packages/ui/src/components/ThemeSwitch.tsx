'use client';
// Escolha de tema: Claro (padrão absoluto), Escuro ou Do sistema. É só a interface; quem guarda a escolha
// e aplica o data-theme é o app. Segue o padrão de rádio: setas movem a seleção e o foco.
import * as React from 'react';
import { cn } from '../lib/cn';
import { EASE_OUT, FOCO } from '../lib/foco';

export type PreferenciaDeTema = 'light' | 'dark' | 'system';

export interface ThemeSwitchProps {
  value: PreferenciaDeTema;
  onChange: (valor: PreferenciaDeTema) => void;
  label?: string;
  className?: string;
}

const OPCOES: { id: PreferenciaDeTema; rotulo: string }[] = [
  { id: 'light', rotulo: 'Claro' },
  { id: 'dark', rotulo: 'Escuro' },
  { id: 'system', rotulo: 'Do sistema' },
];

export function ThemeSwitch({ value, onChange, label = 'Tema', className }: ThemeSwitchProps) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const aoTeclar = (e: React.KeyboardEvent) => {
    const i = OPCOES.findIndex((o) => o.id === value);
    let alvo: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') alvo = (i + 1) % OPCOES.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') alvo = (i - 1 + OPCOES.length) % OPCOES.length;
    if (alvo === null) return;
    e.preventDefault();
    const proxima = OPCOES[alvo]!;
    onChange(proxima.id);
    refs.current[proxima.id]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={aoTeclar}
      className={cn('inline-flex gap-space-1 rounded-pill bg-surface-sunken p-space-1', className)}
    >
      {OPCOES.map((o) => {
        const ativo = o.id === value;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[o.id] = el;
            }}
            type="button"
            role="radio"
            aria-checked={ativo}
            tabIndex={ativo ? 0 : -1}
            onClick={() => onChange(o.id)}
            className={cn(
              'min-h-[44px] rounded-pill px-space-4 font-text text-label',
              `transition-colors duration-fast ${EASE_OUT}`,
              FOCO,
              ativo ? 'bg-surface text-primary' : 'text-ink-muted hover:text-ink',
            )}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
