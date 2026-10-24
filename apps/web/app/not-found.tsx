import Link from 'next/link';
import { ButtonLink } from '@notaa/ui';
import { TelaDeEstado } from './components/TelaDeEstado';

export default function NaoEncontrada() {
  return (
    <TelaDeEstado
      titulo="Não encontramos essa página"
      acoes={
        <ButtonLink as={Link} href="/" variant="primary">
          Ir para o início
        </ButtonLink>
      }
    >
      O endereço pode ter mudado ou não existir. Volte ao início e continue de onde parou.
    </TelaDeEstado>
  );
}
