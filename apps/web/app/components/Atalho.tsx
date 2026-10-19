import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Chip, cn } from '@notaa/ui';

/** Lista de atalhos: linhas separadas por uma linha fina, sem um cartão por item. */
export function AtalhoLista({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('m-0 flex list-none flex-col p-0', className)}>{children}</ul>;
}

/** Um atalho para outra tela: ícone, título, uma frase e, se houver, um número de progresso. */
export function Atalho({
  icone,
  titulo,
  descricao,
  metrica,
  href,
  emBreve = false,
}: {
  icone: ReactNode;
  titulo: string;
  descricao: string;
  metrica?: string;
  href?: string;
  emBreve?: boolean;
}) {
  const corpo = (
    <>
      <span aria-hidden="true" className="mt-1 inline-flex h-5 w-5 flex-none items-center justify-center text-primary">
        {icone}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-space-1">
        <span className="text-body font-bold text-ink">{titulo}</span>
        <span className="max-w-texto text-body-sm text-ink-muted">{descricao}</span>
        {metrica ? <span className="text-caption text-ink-muted">{metrica}</span> : null}
      </span>
      {emBreve ? (
        <Chip tone="neutral">Em breve</Chip>
      ) : (
        <ChevronRight
          aria-hidden="true"
          className="mt-1 h-5 w-5 flex-none text-ink-muted transition-colors duration-fast ease-out group-hover:text-primary"
        />
      )}
    </>
  );
  const linha = 'flex items-start gap-space-4 border-b border-line py-space-4 last:border-b-0';
  return (
    <li>
      {href && !emBreve ? (
        <Link
          href={href}
          className={cn(
            linha,
            'group -mx-space-3 rounded-md px-space-3 no-underline transition-colors duration-fast ease-out hover:bg-violet-tint',
          )}
        >
          {corpo}
        </Link>
      ) : (
        <div className={cn(linha, 'opacity-70')}>{corpo}</div>
      )}
    </li>
  );
}
