import * as React from 'react';
import { SIMBOLO_BORLA as BORLA, SIMBOLO_CORPO as CORPO, SIMBOLO_GRADIENTE_X } from '../lib/simbolo';

export interface NotaASimboloProps {
  className?: string;
  /** Nome acessível. Sem ele o símbolo é decorativo (aria-hidden), o normal ao lado do nome "Nota A". */
  titulo?: string;
}

// Caminhos em lib/simbolo.ts (a partir de assets/nota-a-simbolo.svg). As cores vêm dos tokens da marca, então
// o símbolo não repete nenhum hexadecimal e vale sobre paper e sobre o índigo do tema escuro. A cor entra por
// classe, e não por style="…": páginas com CSP sem style inline (a landing) continuariam pintando o símbolo.

/**
 * Símbolo do Nota A: um "A" feito de capelo de formatura, em gradiente cyan, violeta e magenta, com a borla em azul.
 * Proporção 1,5:1; altura mínima de 20px na tela. Use h-6 (24px) ao lado do nome na SideNav.
 */
export function NotaASimbolo({ className, titulo }: NotaASimboloProps) {
  // O gradiente usa userSpaceOnUse; um id próprio evita colisão quando o símbolo aparece duas vezes.
  const gradiente = `${React.useId()}-nota-a`;
  return (
    <svg
      viewBox="0 0 1214 796"
      className={className}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradiente} gradientUnits="userSpaceOnUse" x1={SIMBOLO_GRADIENTE_X.inicio} y1="0" x2={SIMBOLO_GRADIENTE_X.fim} y2="0">
          <stop offset="0" className="[stop-color:var(--brand-cyan)]" />
          <stop offset="0.5" className="[stop-color:var(--brand-violet)]" />
          <stop offset="1" className="[stop-color:var(--brand-magenta)]" />
        </linearGradient>
      </defs>
      <path className="[fill:var(--brand-blue)]" d={BORLA} />
      <path fill={`url(#${gradiente})`} fillRule="evenodd" d={CORPO} />
    </svg>
  );
}
