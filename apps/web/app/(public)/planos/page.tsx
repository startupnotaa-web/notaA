import Link from 'next/link';
import { ButtonLink } from '@notaa/ui';
import { AuthPagina } from '../../components/auth';

export default function PlanosPage() {
  return (
    <AuthPagina titulo="Planos" descricao="Os planos pagos ainda não estão disponíveis. Você pode criar sua conta e começar pelo plano grátis.">
      <div>
        <ButtonLink as={Link} href="/cadastro" variant="primary">
          Começar grátis
        </ButtonLink>
      </div>
    </AuthPagina>
  );
}
