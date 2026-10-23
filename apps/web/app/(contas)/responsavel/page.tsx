'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button, Notice } from '@notaa/ui';
import { AcessoNegado, PerfilNaoVerificado } from '../../components/AcessoNegado';
import { SeletorDePerfil } from '../../components/SeletorDePerfil';
import { TelaCarregando } from '../../components/TelaCarregando';
import { TelaDeEstado } from '../../components/TelaDeEstado';
import { useAuth } from '../../../lib/auth-context';
import { papeisDaRota } from '../../../lib/destino';
import { useGuardaDePapel } from '../../../lib/guarda-de-papel';

/**
 * Home provisória do responsável. O painel da família ainda não existe; até ele existir, esta tela
 * evita levar o responsável ao hub do aluno, que mostraria dados de um estudante que ele não é. Não
 * lê dado de aluno nenhum.
 */
export default function ResponsavelPage() {
  const guarda = useGuardaDePapel(papeisDaRota('/responsavel'));
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
      titulo="O painel da família chega em breve"
      acoes={
        <>
          <SeletorDePerfil />
          <Button type="button" variant="secondary" onClick={() => void signOut()}>
            Sair da conta
          </Button>
        </>
      }
    >
      <>
        Sua conta de responsável está ativa e o vínculo com o aluno está registrado. Ainda não há tela para acompanhá-lo
        por aqui; avisaremos quando ela estiver pronta.
        <Notice tone="info" className="mt-space-4">
          Por enquanto, o relatório do aluno é visto na conta dele.
        </Notice>
      </>
    </TelaDeEstado>
  );
}
