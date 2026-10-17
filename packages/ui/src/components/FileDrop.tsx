'use client';
// docs/07 §7 — Seleção de arquivo por clique, teclado ou arrastar. O <input
// type="file"> é real (só visualmente oculto), então teclado e leitor de tela
// o operam como qualquer campo; o foco aparece no contorno da área.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface FileDropProps {
  id: string;
  /** Extensões aceitas, ex.: ".csv,.xlsx". É só filtro de seleção: o servidor confere o conteúdo. */
  accept?: string;
  rotulo: React.ReactNode;
  descricao?: React.ReactNode;
  arquivo?: File | null;
  disabled?: boolean;
  onArquivo: (arquivo: File) => void;
  className?: string;
}

export function FileDrop({
  id,
  accept,
  rotulo,
  descricao,
  arquivo,
  disabled = false,
  onArquivo,
  className,
}: FileDropProps) {
  const [arrastando, setArrastando] = React.useState(false);
  const descricaoId = descricao ? `${id}-descricao` : undefined;

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        const f = e.dataTransfer.files[0];
        if (f && !disabled) onArquivo(f);
      }}
      className={cn(
        'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors duration-base',
        'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
        arrastando ? 'border-primary bg-surface-sunken' : 'border-line bg-surface',
        disabled && 'opacity-50',
        className,
      )}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-describedby={descricaoId}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onArquivo(f);
          e.target.value = '';
        }}
      />
      <label htmlFor={id} className={cn('flex flex-col items-center gap-2', !disabled && 'cursor-pointer')}>
        <span className="text-base font-semibold text-ink">{rotulo}</span>
        {arquivo ? (
          <span className="text-sm text-ink">
            Selecionado: <strong>{arquivo.name}</strong>
          </span>
        ) : (
          <span className="text-sm text-ink-muted">Clique para escolher ou arraste o arquivo para cá.</span>
        )}
      </label>
      {descricao ? (
        <p id={descricaoId} className="mt-2 text-sm text-ink-muted">
          {descricao}
        </p>
      ) : null}
    </div>
  );
}
