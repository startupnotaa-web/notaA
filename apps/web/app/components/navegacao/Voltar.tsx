import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ButtonLink } from '@notaa/ui';

/** Link discreto de volta para a tela anterior, com alvo de 44px. */
export function Voltar({ href = '/dashboard', rotulo = 'Voltar ao painel' }: { href?: string; rotulo?: string }) {
  return (
    <ButtonLink as={Link} href={href} variant="quiet" className="-ml-space-4 self-start">
      <ArrowLeft aria-hidden="true" className="h-5 w-5" />
      {rotulo}
    </ButtonLink>
  );
}
