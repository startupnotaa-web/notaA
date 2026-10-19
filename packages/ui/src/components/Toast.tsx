'use client';
// Aviso passageiro. Um pub/sub de módulo + <Toaster/> montado uma vez no layout: qualquer
// client component chama `toast(msg)`, sem Provider. As regiões ao vivo existem desde o início
// (leitores de tela só anunciam o que entra numa região já presente).
import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';
import { EASE_OUT, FOCO } from '../lib/foco';
import { StatusIcon, type StatusIconTone } from './StatusIcon';

export type ToastVariant = 'error' | 'success' | 'info';
type ToastItem = { id: number; message: string; variant: ToastVariant; durationMs: number };

let sequencia = 0;
let itens: ToastItem[] = [];
const ouvintes = new Set<(itens: ToastItem[]) => void>();

function emitir() {
  for (const ouvinte of ouvintes) ouvinte(itens);
}

// Erro fica mais tempo: precisa ser lido, e muitas vezes diz o que fazer em seguida.
const DURACAO_PADRAO: Record<ToastVariant, number> = { info: 4500, success: 4500, error: 8000 };

export function toast(message: string, opts?: { variant?: ToastVariant; durationMs?: number }) {
  const id = ++sequencia;
  const variant = opts?.variant ?? 'info';
  itens = [...itens, { id, message, variant, durationMs: opts?.durationMs ?? DURACAO_PADRAO[variant] }];
  emitir();
  return id;
}

export function dismiss(id: number) {
  itens = itens.filter((t) => t.id !== id);
  emitir();
}

const ICONE: Record<ToastVariant, StatusIconTone> = { error: 'danger', success: 'success', info: 'info' };
const COR: Record<ToastVariant, string> = { error: 'text-danger', success: 'text-success', info: 'text-info' };

function Aviso({ item }: { item: ToastItem }) {
  const [pausado, setPausado] = React.useState(false);

  // Passar o mouse ou focar pausa a contagem (quem lê devagar não perde o aviso).
  React.useEffect(() => {
    if (pausado) return;
    const timer = setTimeout(() => dismiss(item.id), item.durationMs);
    return () => clearTimeout(timer);
  }, [pausado, item.id, item.durationMs]);

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      className={cn(
        'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-md border border-line bg-surface p-4 font-text text-body-sm text-ink shadow-raise',
        'animate-[na-rise-in_240ms_var(--ease-out)] motion-reduce:animate-none',
      )}
    >
      <StatusIcon tone={ICONE[item.variant]} className={cn('mt-px h-5 w-5 flex-none', COR[item.variant])} />
      <span className="flex-1">{item.message}</span>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => dismiss(item.id)}
        className={cn(
          '-m-3 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-ink-muted hover:text-ink',
          `transition-colors duration-fast ${EASE_OUT}`,
          FOCO,
        )}
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

const REGIAO = 'pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4';

export function Toaster() {
  const [lista, setLista] = React.useState<ToastItem[]>([]);
  React.useEffect(() => {
    const ouvinte = (proximos: ToastItem[]) => setLista(proximos);
    ouvintes.add(ouvinte);
    setLista(itens);
    return () => {
      ouvintes.delete(ouvinte);
    };
  }, []);

  return (
    <>
      {/* Informativos e de sucesso: esperam a vez. */}
      <div role="status" aria-live="polite" aria-atomic="false" className={cn(REGIAO, 'top-3')}>
        {lista
          .filter((t) => t.variant !== 'error')
          .map((t) => (
            <Aviso key={t.id} item={t} />
          ))}
      </div>
      {/* Erros: anunciam na hora. */}
      <div role="alert" aria-atomic="false" className={cn(REGIAO, 'top-3')}>
        {lista
          .filter((t) => t.variant === 'error')
          .map((t) => (
            <Aviso key={t.id} item={t} />
          ))}
      </div>
    </>
  );
}
