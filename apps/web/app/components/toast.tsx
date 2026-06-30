'use client';
// Toast leve (estilo sonner) sem dependência externa nem Provider: um pub/sub
// de módulo + <Toaster/> montado uma vez no layout do estudante. Qualquer client
// component chama `toast(msg)` — usado para o tratamento de erro amigável das
// telas de IA (doc: "servidores de IA lotados, tente novamente"). Acessível:
// region aria-live="polite".
import { useEffect, useState } from 'react';
import { cn } from '@notaa/ui';

export type ToastVariant = 'error' | 'success' | 'info';
type ToastItem = { id: number; message: string; variant: ToastVariant };

let seq = 0;
const listeners = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];

function emit() {
  for (const l of listeners) l(items);
}

export function toast(message: string, opts?: { variant?: ToastVariant; durationMs?: number }) {
  const id = ++seq;
  const variant = opts?.variant ?? 'info';
  items = [...items, { id, message, variant }];
  emit();
  const duration = opts?.durationMs ?? 4500;
  setTimeout(() => dismiss(id), duration);
  return id;
}

export function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  error: 'border-error/50 bg-surface text-text',
  success: 'border-success/50 bg-surface text-text',
  info: 'border-border bg-surface text-text',
};
const VARIANT_ICON: Record<ToastVariant, string> = { error: '⚠️', success: '✅', info: 'ℹ️' };

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>([]);
  useEffect(() => {
    const l = (next: ToastItem[]) => setList(next);
    listeners.add(l);
    setList(items);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4"
    >
      {list.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm shadow-2 backdrop-blur-md',
            'animate-in fade-in slide-in-from-top-2 duration-300',
            VARIANT_STYLES[t.variant],
          )}
        >
          <span aria-hidden="true" className="text-base leading-none">
            {VARIANT_ICON[t.variant]}
          </span>
          <span className="flex-1">{t.message}</span>
          <span aria-hidden="true" className="text-text-muted">
            ✕
          </span>
        </button>
      ))}
    </div>
  );
}
