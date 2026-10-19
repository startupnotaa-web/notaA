'use client';
import * as React from 'react';

export interface Atalho {
  /** Tecla, em minúsculas (`k`, `?`, `/`, `Escape`…). */
  tecla: string;
  /** Exige Ctrl (Windows e Linux) ou Cmd (Mac). */
  mod?: boolean;
  /** Atalhos sem modificador não disparam enquanto a pessoa digita num campo. Padrão: ignorar. */
  emCampo?: boolean;
  aoAcionar: (e: KeyboardEvent) => void;
}

const ehCampo = (alvo: EventTarget | null) => {
  if (!(alvo instanceof HTMLElement)) return false;
  return alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName);
};

/** Registra atalhos de teclado do documento. Ctrl/Cmd+K e `?` são os do aplicativo. */
export function useAtalhos(atalhos: Atalho[]) {
  const ref = React.useRef(atalhos);
  ref.current = atalhos;
  React.useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      for (const a of ref.current) {
        const mod = e.ctrlKey || e.metaKey;
        if (Boolean(a.mod) !== mod) continue;
        if (e.key.toLowerCase() !== a.tecla.toLowerCase()) continue;
        if (!a.mod && !a.emCampo && ehCampo(e.target)) continue;
        e.preventDefault();
        a.aoAcionar(e);
        return;
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, []);
}

/** `⌘` no Mac, `Ctrl` nos demais. Só no navegador; no servidor assume Ctrl. */
export function teclaModificadora(): string {
  if (typeof navigator === 'undefined') return 'Ctrl';
  return /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
}
