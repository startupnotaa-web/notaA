import type { ReactNode } from 'react';
import Link from 'next/link';
import { NotaASimbolo, PageHeader } from '@notaa/ui';

/** Moldura das telas de entrada (login, cadastro, confirmação, convite): uma coluna estreita, alinhada à esquerda. */
export function AuthPagina({
  titulo,
  descricao,
  children,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main id="conteudo" className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-space-6 px-4 py-space-7">
      <Link
        href="/"
        aria-label="Nota A, ir para a página inicial"
        className="flex items-center gap-2 self-start rounded-md font-display text-[17px] font-semibold text-ink no-underline"
      >
        <NotaASimbolo className="h-6 w-auto" />
        Nota A
      </Link>
      <PageHeader title={titulo} description={descricao} />
      {children}
    </main>
  );
}

/** Divisor "ou continue com", sem caixa alta. */
export function SeparadorOu() {
  return (
    <div className="flex items-center gap-space-3 text-caption text-ink-muted">
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      ou continue com
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}

export function IconeGoogle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
    </svg>
  );
}
