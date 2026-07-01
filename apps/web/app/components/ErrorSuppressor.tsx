'use client';

import { useEffect } from 'react';

/**
 * Filtra erros globais de extensões de navegador (gerenciadores de senha,
 * bloqueadores de anúncio, etc.) que injetam scripts e falham com erros como
 * "Could not establish connection. Receiving end does not exist". Esses erros
 * não vêm da nossa aplicação e poluem o console, podendo até disparar lógica
 * de error boundary se não forem filtrados.
 *
 * Monta um listener de `unhandledrejection` que chama `preventDefault()` nos
 * erros conhecidos de extensão — impedindo que apareçam como erros não-tratados.
 */

const EXTENSION_ERROR_PATTERNS = [
  'could not establish connection',
  'receiving end does not exist',
  'extension context invalidated',
  'message channel closed',
  'message port closed',
  'a listener indicated an asynchronous response',
] as const;

function isExtensionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return EXTENSION_ERROR_PATTERNS.some((pattern) => msg.includes(pattern));
}

export function ErrorSuppressor() {
  useEffect(() => {
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (isExtensionError(event.reason)) {
        event.preventDefault(); // Impede que apareça como "Uncaught (in promise)" no console.
      }
    }

    function handleError(event: ErrorEvent) {
      if (isExtensionError(event.error)) {
        event.preventDefault();
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null; // Componente invisível — só registra os listeners.
}
