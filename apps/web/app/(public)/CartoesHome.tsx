'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './home.module.css';

export function CartoesHome({ children }: { children: ReactNode[] }) {
  const lista = useRef<HTMLUListElement>(null);
  const [entrou, setEntrou] = useState(false);
  const [ponteiro, setPonteiro] = useState<number | null>(null);
  const [foco, setFoco] = useState<number | null>(null);
  const ativo = foco ?? ponteiro;

  useEffect(() => {
    const elemento = lista.current;
    if (!elemento || !('IntersectionObserver' in window)) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) return;
        setEntrou(true);
        observador.disconnect();
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return (
    <ul
      ref={lista}
      className={styles.guideCards}
      data-entered={entrou}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse' || !window.matchMedia('(min-width: 961px)').matches)
          return;
        const { left, width } = event.currentTarget.getBoundingClientRect();
        const index = Math.floor((event.clientX - left) / (width / children.length));
        if (index >= 0 && index < children.length) setPonteiro(index);
      }}
      onPointerLeave={() => setPonteiro(null)}
    >
      {children.map((cartao, index) => {
        const distancia = ativo === null ? 0 : index - ativo;
        const estilo = {
          '--card-index': index,
          '--card-shift': distancia ? `${19 / distancia}%` : '0%',
        } as CSSProperties;
        return (
          <li
            key={index}
            data-active={index === ativo}
            style={estilo}
            onFocus={(event) => {
              if (event.target.matches(':focus-visible')) setFoco(index);
            }}
            onBlur={() => setFoco(null)}
          >
            {cartao}
          </li>
        );
      })}
    </ul>
  );
}
