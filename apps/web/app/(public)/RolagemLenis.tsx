'use client';

import { useEffect } from 'react';

interface OpcoesLenis {
  lerp: number;
  autoRaf: boolean;
  anchors: boolean;
}

declare global {
  interface Window {
    Lenis?: new (opcoes: OpcoesLenis) => { destroy: () => void };
  }
}

export function RolagemLenis() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let instanciado: { destroy: () => void } | undefined;
    let ativo = true;
    const script = document.createElement('script');

    const iniciar = () => {
      if (!ativo || !window.Lenis) return;
      instanciado = new window.Lenis({ lerp: 0.2, autoRaf: true, anchors: true });
    };

    if (window.Lenis) {
      iniciar();
    } else {
      script.src = '/vendor/lenis.min.js';
      script.async = true;
      script.addEventListener('load', iniciar, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      ativo = false;
      instanciado?.destroy();
      script.remove();
    };
  }, []);

  return null;
}
