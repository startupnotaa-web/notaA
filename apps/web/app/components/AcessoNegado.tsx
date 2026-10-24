'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Papel } from '@notaa/contracts';
import { Button, ButtonLink } from '@notaa/ui';
import { useAuth } from '../../lib/auth-context';
import { homeDoPapel } from '../../lib/destino';
import { TelaCarregando } from './TelaCarregando';
import { TelaDeEstado } from './TelaDeEstado';

const PAPEL_POR_EXTENSO: Record<Papel, string> = {
  estudante: 'aluno',
  professor_institucional: 'professor',
  professor_independente: 'professor',
  admin_instituicao: 'gestão da instituição',
  responsavel: 'responsável',
  admin: 'administração da plataforma',
};

/**
 * Tela de "sem acesso" (o 403 da interface): a conta está certa, a área é de outro perfil. Não
 * redireciona sozinha, e por isso não pode virar loop; mostra o caminho de volta e a saída para
 * quem entrou na conta errada. O servidor recusa por conta própria; isto só evita uma tela vazia.
 */
export function AcessoNegado({ papel }: { papel: Papel }) {
  const { signOut } = useAuth();
  return (
    <TelaDeEstado
      titulo="Esta área é de outro perfil"
      acoes={
        <>
          <ButtonLink as={Link} href={homeDoPapel(papel)} variant="primary">
            Ir para o meu painel
          </ButtonLink>
          <Button type="button" variant="secondary" onClick={() => void signOut()}>
            Sair da conta
          </Button>
        </>
      }
    >
      Você entrou como {PAPEL_POR_EXTENSO[papel]}, e esta tela não faz parte desse acesso. Volte para o seu painel. Se
      entrou na conta errada, saia e entre com a outra.
    </TelaDeEstado>
  );
}

/**
 * Há sessão, mas o token não diz qual é o perfil da conta (o cadastro não terminou). Não é "papel
 * errado" e nunca é motivo para mostrar o painel do aluno: leva à tela "Concluir cadastro", que guarda
 * para onde a pessoa queria ir e a devolve para lá quando o cadastro terminar.
 */
export function IrParaConcluirCadastro() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    router.replace(`/concluir-cadastro?next=${encodeURIComponent(pathname)}`);
  }, [router, pathname]);
  return <TelaCarregando rotulo="Verificando o seu cadastro" />;
}
