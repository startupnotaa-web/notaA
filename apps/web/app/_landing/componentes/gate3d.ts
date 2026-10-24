'use client';

import { useEffect, useState } from 'react';

/**
 * Decide se a página pode trocar a arte estática por uma cena 3D.
 *
 * - `aguardando`: ainda não sabemos (servidor e primeira pintura). Mostra o fallback.
 * - `estatico`: não vai ter 3D. O `motivo` diz por quê.
 * - `liberado`: pode carregar a cena, e só depois de o conteúdo ter carregado.
 *
 * Fica no fallback quando há prefers-reduced-motion, economia de dados, aparelho fraco
 * (`hardwareConcurrency` <= 4; sem a informação, presume-se capaz) ou ausência de WebGL.
 * `three` só é pedido depois do evento `load`, de um momento ocioso e da primeira interação (ou 8 s), então não
 * disputa o LCP nem pesa no tempo de bloqueio da página.
 */
export type EstadoDoGate = 'aguardando' | 'estatico' | 'liberado';

export type MotivoDoFallback = 'movimento-reduzido' | 'economia-de-dados' | 'aparelho-fraco' | 'sem-webgl';

interface NavegadorComExtras extends Navigator {
  connection?: { saveData?: boolean };
}

function temWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return false;
    // Devolve o contexto na hora: navegador limita contextos ativos, e este era só um teste.
    (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function motivoParaFicarEstatico(): MotivoDoFallback | null {
  const nav = navigator as NavegadorComExtras;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'movimento-reduzido';
  if (nav.connection?.saveData) return 'economia-de-dados';
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) return 'aparelho-fraco';
  if (!temWebGL()) return 'sem-webgl';
  return null;
}

/** Tempo máximo de espera pela primeira interação antes de liberar o 3D mesmo assim. */
const ESPERA_MAXIMA_MS = 8000;
const EVENTOS_DE_PRESENCA = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Roda `fn` na primeira interação da pessoa (mover o ponteiro, tocar, rolar, teclar) ou, se ela só ficar olhando,
 * depois de `ESPERA_MAXIMA_MS`. O 3D é decoração: enquanto ninguém interage, a arte estática basta e a página não
 * paga o custo de carregar e executar o three (é o que mantém o tempo de bloqueio da thread principal baixo).
 */
function quandoHouverPresenca(fn: () => void): () => void {
  let feito = false;
  const disparar = () => {
    if (feito) return;
    feito = true;
    limpar();
    fn();
  };
  const temporizador = window.setTimeout(disparar, ESPERA_MAXIMA_MS);
  for (const e of EVENTOS_DE_PRESENCA) window.addEventListener(e, disparar, { passive: true, once: true });
  function limpar() {
    window.clearTimeout(temporizador);
    for (const e of EVENTOS_DE_PRESENCA) window.removeEventListener(e, disparar);
  }
  return limpar;
}

/** Roda `fn` quando o navegador estiver ocioso, depois de a página terminar de carregar. */
function quandoOcioso(fn: () => void): () => void {
  let cancelado = false;
  let idle: number | undefined;
  let temporizador: number | undefined;
  const agendar = () => {
    if (cancelado) return;
    if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(() => !cancelado && fn(), { timeout: 3000 });
    else temporizador = window.setTimeout(() => !cancelado && fn(), 300);
  };
  if (document.readyState === 'complete') agendar();
  else window.addEventListener('load', agendar, { once: true });
  return () => {
    cancelado = true;
    window.removeEventListener('load', agendar);
    if (idle !== undefined) window.cancelIdleCallback(idle);
    if (temporizador !== undefined) window.clearTimeout(temporizador);
  };
}

export function useGate3D(): { estado: EstadoDoGate; motivo: MotivoDoFallback | null } {
  const [gate, setGate] = useState<{ estado: EstadoDoGate; motivo: MotivoDoFallback | null }>({
    estado: 'aguardando',
    motivo: null,
  });

  useEffect(() => {
    const motivo = motivoParaFicarEstatico();
    if (motivo) {
      setGate({ estado: 'estatico', motivo });
      return;
    }
    // Depois do load, num momento ocioso, e só então à espera de alguém aparecer.
    let cancelarPresenca: (() => void) | null = null;
    const cancelarOcioso = quandoOcioso(() => {
      cancelarPresenca = quandoHouverPresenca(() => setGate({ estado: 'liberado', motivo: null }));
    });
    const cancelar = () => {
      cancelarOcioso();
      cancelarPresenca?.();
    };

    // Se a pessoa ligar "reduzir movimento" com a página aberta, a cena sai.
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const aoMudar = () => mq.matches && setGate({ estado: 'estatico', motivo: 'movimento-reduzido' });
    mq.addEventListener('change', aoMudar);
    return () => {
      cancelar();
      mq.removeEventListener('change', aoMudar);
    };
  }, []);

  return gate;
}
