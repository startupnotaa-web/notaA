'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@notaa/ui';
import { AcessoNegado, PerfilNaoVerificado } from '../../components/AcessoNegado';
import { TelaCarregando } from '../../components/TelaCarregando';
import { TelaDeEstado } from '../../components/TelaDeEstado';
import { useAuth } from '../../../lib/auth-context';
import { papeisDaRota } from '../../../lib/destino';
import { useGuardaDePapel } from '../../../lib/guarda-de-papel';

/**
 * Home do administrador da plataforma. A administração é feita pela API e pelo banco; não há painel no
 * web. Em vez de levá-lo a uma tela de aluno ou de instituição, esta tela diz isso e oferece a saída.
 */
export default function AdminPage() {
  const guarda = useGuardaDePapel(papeisDaRota('/admin'));
  const { signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (guarda.estado === 'sem-sessao') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [guarda.estado, pathname, router]);

  if (guarda.estado === 'carregando' || guarda.estado === 'sem-sessao') return <TelaCarregando />;
  if (guarda.estado === 'sem-papel') return <PerfilNaoVerificado />;
  if (guarda.estado === 'negado') return <AcessoNegado papel={guarda.papel} />;

  return (
    <TelaDeEstado
      titulo="A administração da plataforma não tem painel no web"
      acoes={
        <Button type="button" variant="secondary" onClick={() => void signOut()}>
          Sair da conta
        </Button>
      }
    >
      Esta conta administra a plataforma pela API e pelo banco de dados. As telas de aluno, de professor e de instituição
      são de outros perfis.
    </TelaDeEstado>
  );
}
