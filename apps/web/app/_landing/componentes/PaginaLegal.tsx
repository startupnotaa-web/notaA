import Link from 'next/link';
import type { ReactNode } from 'react';
import { NotaASimbolo } from '@notaa/ui';
import { FOCO } from './estilos';
import { Rodape } from './Rodape';

/** Casca das páginas de privacidade e termos: título, data da versão e texto corrido, no sistema de design padrão. */
export function PaginaLegal({ titulo, atualizacao, children }: { titulo: string; atualizacao?: string; children: ReactNode }) {
  return (
    <div data-theme="light" className="min-h-screen bg-paper font-text text-ink">
      <header className="mx-auto flex w-full max-w-landing items-center gap-6 px-5 py-5 md:px-10">
        <Link href="/" className={`inline-flex min-h-[44px] items-center gap-2.5 rounded-sm font-display text-heading-3 font-semibold ${FOCO}`}>
          <NotaASimbolo className="h-8 w-auto" />
          Nota A
          <span className="sr-only">, página inicial</span>
        </Link>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-landing px-5 pb-20 pt-6 md:px-10">
        <div className="max-w-texto">
          <h1 className="m-0 font-display text-heading-1 font-semibold">{titulo}</h1>
          {atualizacao && <p className="mb-6 mt-2 text-body-sm text-ink-muted">{atualizacao}</p>}
          <div className="flex flex-col gap-8 text-body [&_h2]:m-0 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-heading-3 [&_h2]:font-semibold [&_li]:mb-1 [&_p]:m-0 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-6">
            {children}
          </div>
        </div>
      </main>
      <Rodape className="text-ink-muted" classeDoLink="hover:text-primary" />
    </div>
  );
}
