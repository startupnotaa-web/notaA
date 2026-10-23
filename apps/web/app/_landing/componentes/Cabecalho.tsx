import Link from 'next/link';
import type { ReactNode } from 'react';
import { NotaASimbolo, cn } from '@notaa/ui';

export interface CabecalhoProps {
  /** Selo do ambiente ao lado do nome ("Aluno", "Escola"…). Ausente na home. */
  selo?: ReactNode;
  /** Âncoras da própria página. */
  links: { href: string; rotulo: string }[];
  /** Link que sai do ambiente. Na home é "Entrar"; nos ambientes é "Voltar ao Nota A". */
  secundario: { href: string; rotulo: string };
  /** Botão principal (já estilizado pelo ambiente). */
  acao: ReactNode;
  className?: string;
  classeDoLink?: string;
  classeDoNome?: string;
}

/** Topo das páginas públicas. O primeiro foco é "Ir para o conteúdo", que só aparece quando ganha foco. */
export function Cabecalho({ selo, links, secundario, acao, className, classeDoLink, classeDoNome }: CabecalhoProps) {
  const link = cn(
    'inline-flex min-h-[44px] items-center rounded-sm px-1.5 font-text text-label font-bold focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[color:var(--amb-focus,var(--focus))]',
    classeDoLink,
  );
  return (
    <header className={cn('relative mx-auto flex w-full max-w-landing flex-wrap items-center gap-x-8 gap-y-3 px-5 py-5 md:px-10', className)}>
      <a
        href="#conteudo"
        className="absolute left-5 top-1 z-50 -translate-y-24 rounded-sm bg-surface px-4 py-3 font-text text-label font-bold text-ink focus:translate-y-0 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus"
      >
        Ir para o conteúdo
      </a>
      <Link href="/" className={cn('inline-flex min-h-[44px] items-center gap-2.5 rounded-sm font-display text-heading-3 font-semibold', classeDoNome)}>
        <NotaASimbolo className="h-8 w-auto" />
        Nota A
        <span className="sr-only">, página inicial</span>
      </Link>
      {selo}
      <nav aria-label="Principal" className="flex flex-wrap gap-x-5 gap-y-1 md:ml-4">
        {links.map((l) => (
          <a key={l.href} href={l.href} className={link}>
            {l.rotulo}
          </a>
        ))}
      </nav>
      <div className="hidden flex-1 md:block" />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 max-md:w-full">
        <Link href={secundario.href} className={link}>
          {secundario.rotulo}
        </Link>
        {acao}
      </div>
    </header>
  );
}
