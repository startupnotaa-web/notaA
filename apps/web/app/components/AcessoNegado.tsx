'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Papel } from '@notaa/contracts';
import { Button, ButtonLink, Notice } from '@notaa/ui';
import { useAuth } from '../../lib/auth-context';
import { homeDoPapel } from '../../lib/destino';
import { garantirRegistro } from '../../lib/post-auth';
import { supabaseBrowser } from '../../lib/supabase-browser';
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
 * Há sessão, mas o token não diz qual é o perfil da conta (o cadastro não terminou ou a API não
 * respondeu). Não é "papel errado": tenta de novo em vez de mandar a pessoa para o painel do aluno.
 */
export function PerfilNaoVerificado() {
  const { signOut } = useAuth();
  const [tentando, setTentando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  async function tentarDeNovo() {
    setTentando(true);
    setFalhou(false);
    await garantirRegistro();
    const { data } = await supabaseBrowser.auth.refreshSession();
    // Com papel no token novo, o AuthProvider atualiza a sessão e o guarda libera a tela sozinho.
    if (!data.session?.user.app_metadata?.papel) setFalhou(true);
    setTentando(false);
  }

  return (
    <TelaDeEstado
      titulo="Não foi possível verificar o seu perfil"
      acoes={
        <>
          <Button type="button" variant="primary" loading={tentando} onClick={() => void tentarDeNovo()}>
            {tentando ? 'Verificando' : 'Tentar de novo'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void signOut()}>
            Sair da conta
          </Button>
        </>
      }
    >
      <>
        O Nota A não conseguiu confirmar que tipo de conta é esta. Isso costuma passar em instantes.
        {falhou ? (
          <Notice tone="danger" className="mt-space-4">
            Ainda não deu. Confira a conexão e tente de novo, ou entre outra vez.
          </Notice>
        ) : null}
      </>
    </TelaDeEstado>
  );
}
