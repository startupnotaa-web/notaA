'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@notaa/ui';
import type { Cena, ContextoCena, ModuloCena } from '../cenas/tipos';
import { useGate3D } from './gate3d';

export interface PalcoProps {
  /**
   * Import dinâmico da cena: `() => import('../cenas/aluno')`. É o único lugar que referencia o three, e só é
   * chamado no cliente, depois do gate e do carregamento da página.
   */
  carregar: () => Promise<ModuloCena>;
  /** Arte estática (CSS/SVG da referência). É o que a pessoa vê até a cena ficar pronta, e o que fica sem 3D. */
  fallback: ReactNode;
  /** Camada sobre a cena: legendas, e os links de texto em HTML (`data-ancora`) que a cena posiciona. */
  children?: ReactNode;
  className?: string;
  /** Onde a arte ocupa o palco (padrão: tudo). Deixa a camada de texto crescer em fluxo no celular. */
  classeDaArte?: string;
}

/**
 * Janela de uma cena 3D. Cuida do que não é desenho: quando carregar (gate), pausar fora da viewport e com a
 * aba oculta, descartar a cena ao desmontar e voltar ao fallback se o WebGL falhar.
 *
 * `data-cena` diz em que pé está: `aguardando`, `estatica`, `carregando` ou `pronta`.
 */
export function Palco({ carregar, fallback, children, className, classeDaArte = 'inset-0' }: PalcoProps) {
  const { estado: gate, motivo } = useGate3D();
  const [fase, setFase] = useState<'carregando' | 'pronta' | 'falhou'>('carregando');
  const raiz = useRef<HTMLDivElement>(null);
  const alvo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gate !== 'liberado') return;
    const elRaiz = raiz.current;
    const elAlvo = alvo.current;
    if (!elRaiz || !elAlvo) return;

    let cena: Cena | null = null;
    let cancelado = false;
    let visivel = true;
    let observador: IntersectionObserver | null = null;

    const atualizar = () => {
      if (!cena) return;
      if (visivel && !document.hidden) cena.retomar();
      else cena.pausar();
    };
    const falhar = () => {
      cena?.destruir();
      cena = null;
      if (!cancelado) setFase('falhou');
    };

    (async () => {
      try {
        // As texturas desenham texto: sem as fontes prontas o canvas usaria a fonte de reserva.
        await document.fonts?.ready;
        const modulo = await carregar();
        if (cancelado) return;
        const estilo = getComputedStyle(elRaiz);
        const ctx: ContextoCena = {
          cor: (nome) => estilo.getPropertyValue(`--${nome}`).trim() || 'magenta',
          fontes: {
            display: estilo.getPropertyValue('--font-display').trim() || 'sans-serif',
            texto: estilo.getPropertyValue('--font-text').trim() || 'sans-serif',
          },
          aoFalhar: falhar,
        };
        const montada = await modulo.montar(elAlvo, elRaiz, ctx);
        if (cancelado) {
          montada.destruir();
          return;
        }
        cena = montada;
        setFase('pronta');
        observador = new IntersectionObserver(([e]) => {
          visivel = e?.isIntersecting ?? true;
          atualizar();
        });
        observador.observe(elRaiz);
        document.addEventListener('visibilitychange', atualizar);
        atualizar();
      } catch {
        // Sem WebGL de verdade, módulo que não carregou ou textura que falhou: fica a arte estática.
        if (!cancelado) setFase('falhou');
      }
    })();

    return () => {
      cancelado = true;
      observador?.disconnect();
      document.removeEventListener('visibilitychange', atualizar);
      cena?.destruir();
      cena = null;
    };
    // `carregar` é uma função nova a cada render do pai; o que decide é o gate.
  }, [gate]);

  const situacao =
    gate === 'aguardando'
      ? 'aguardando'
      : gate === 'estatico' || fase === 'falhou'
        ? 'estatica'
        : fase === 'pronta'
          ? 'pronta'
          : 'carregando';

  return (
    <div ref={raiz} data-cena={situacao} data-motivo={motivo ?? undefined} className={cn('relative', className)}>
      <div
        aria-hidden="true"
        className={cn(
          'absolute transition-opacity duration-base ease-out motion-reduce:transition-none',
          classeDaArte,
          situacao === 'pronta' && 'opacity-0',
        )}
      >
        {fallback}
      </div>
      <div ref={alvo} aria-hidden="true" className={cn('absolute [&>canvas]:h-full [&>canvas]:w-full', classeDaArte)} />
      {children}
    </div>
  );
}
