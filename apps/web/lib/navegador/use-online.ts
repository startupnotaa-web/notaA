'use client';
import { useSyncExternalStore } from 'react';

function assinar(aoMudar: () => void) {
  window.addEventListener('online', aoMudar);
  window.addEventListener('offline', aoMudar);
  return () => {
    window.removeEventListener('online', aoMudar);
    window.removeEventListener('offline', aoMudar);
  };
}

/** Estado da conexão do navegador. No servidor e na primeira pintura vale "online", para não piscar um aviso à toa. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    assinar,
    () => navigator.onLine,
    () => true,
  );
}
