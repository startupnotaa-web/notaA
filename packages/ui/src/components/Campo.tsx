import * as React from 'react';
import { cn } from '../lib/cn';

export interface CampoProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** Substitui a dica e marca o campo como inválido. */
  error?: React.ReactNode;
  id?: string;
  describedBy?: string;
  className?: string;
  /** Mantém o rótulo para leitores de tela e o esconde da vista. Só para células de tabela, onde o cabeçalho da coluna já o diz. */
  labelOculto?: boolean;
}

/** Rótulo visível + controle + dica/erro ligados por aria-describedby. Base de TextField e Select. */
export function Campo({
  label,
  hint,
  error,
  id,
  describedBy,
  className,
  labelOculto,
  children,
}: CampoProps & { children: (ligacao: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => React.ReactNode }) {
  const auto = React.useId();
  const campoId = id ?? auto;
  const mensagem = error ?? hint;
  const mensagemId = `${campoId}-msg`;
  const ids = [describedBy, mensagem ? mensagemId : undefined].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={campoId} className={cn('font-text text-sm font-bold leading-5 text-ink', labelOculto && 'sr-only')}>
        {label}
      </label>
      {children({ id: campoId, 'aria-describedby': ids, 'aria-invalid': error ? true : undefined })}
      {mensagem ? (
        <span id={mensagemId} className={cn('font-text text-sm leading-[22px]', error ? 'text-danger' : 'text-ink-muted')}>
          {mensagem}
        </span>
      ) : null}
    </div>
  );
}

export const classesDoControle = (comErro: boolean) =>
  cn(
    'min-h-[44px] w-full rounded-sm border bg-surface px-3 font-text text-base leading-6 text-ink',
    'transition-colors duration-fast ease-[var(--ease-out)] placeholder:text-ink-muted',
    'disabled:bg-surface-sunken disabled:text-ink-muted',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
    comErro ? 'border-2 border-danger' : 'border-line-strong',
  );
