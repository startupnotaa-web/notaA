import Link from 'next/link';
import { cn } from '@notaa/ui';
import { DADOS_JURIDICOS, juridicoCompleto } from '../../../lib/juridico';

/** Rodapé das páginas públicas. A razão social e o CNPJ entram só quando estiverem em lib/juridico.ts. */
export function Rodape({ className, classeDoLink }: { className?: string; classeDoLink?: string }) {
  const link = cn(
    'inline-flex min-h-[44px] items-center rounded-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[color:var(--amb-focus,var(--focus))]',
    classeDoLink,
  );
  return (
    <footer className={cn('mx-auto flex w-full max-w-landing flex-wrap items-center gap-x-8 gap-y-2 px-5 pb-14 font-text text-body-sm md:px-10', className)}>
      <span>
        {juridicoCompleto() ? `Nota A é um produto de ${DADOS_JURIDICOS.razaoSocial}, CNPJ ${DADOS_JURIDICOS.cnpj}.` : 'Nota A'}
      </span>
      <span className="flex-1" />
      <Link href="/#ambientes" className={link}>
        Ver os outros ambientes
      </Link>
      <Link href="/privacidade" className={link}>
        Privacidade
      </Link>
      <Link href="/termos" className={link}>
        Termos de uso
      </Link>
    </footer>
  );
}
