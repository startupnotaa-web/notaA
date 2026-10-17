import * as React from 'react';
import { cn } from '../lib/cn';

export interface AuroraProps {
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

// Única animação autônoma do sistema, com ease-in-out. Os keyframes vivem em tokens/base.css,
// e prefers-reduced-motion e [data-anim='off'] a param. Só na landing e na home do aluno.
const BLOB =
  'pointer-events-none absolute -z-10 aspect-square w-[70%] rounded-full opacity-[0.22] blur-[72px] dark:opacity-30 motion-reduce:animate-none';

/** Fundo fluido da marca. O conteúdo fica por cima; o símbolo não deve ficar sobre a aurora com opacidade alta. */
export function Aurora({ as, className, style, children }: AuroraProps) {
  const Tag: React.ElementType = as ?? 'div';
  return (
    <Tag className={cn('relative isolate overflow-hidden bg-paper', className)} style={style}>
      <span
        aria-hidden="true"
        className={cn(
          BLOB,
          '-left-[15%] -top-[35%] bg-[radial-gradient(circle,var(--brand-cyan),transparent_65%)]',
          'animate-[na-drift_38s_var(--ease-in-out)_infinite_alternate]',
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          BLOB,
          '-bottom-[45%] -right-[20%] bg-[radial-gradient(circle,var(--brand-magenta),transparent_65%)]',
          'animate-[na-drift_46s_var(--ease-in-out)_infinite_alternate-reverse]',
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_40%,var(--brand-violet),transparent_70%)] opacity-[0.12] animate-[na-breathe_24s_var(--ease-in-out)_infinite_alternate] motion-reduce:animate-none"
      />
      {children}
    </Tag>
  );
}
