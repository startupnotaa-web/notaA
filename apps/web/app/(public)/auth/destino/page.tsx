'use client';

// Destino do retorno do Google. Garante o registro, lê o papel do token e leva a pessoa à home do
// perfil dela (o aluno novo passa pelo onboarding), ou pergunta "Entrar como…" se a conta tem mais de
// um acesso. Fica fora do /login para que o redirecionamento do OAuth tenha um endereço fixo.
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { semRotulo, type ContextoListado } from '@notaa/contracts';
import { ButtonLink, Notice } from '@notaa/ui';
import { AuthPagina } from '../../../components/acesso/auth';
import { EscolherContexto } from '../../../components/acesso/EscolherContexto';
import { useAuth } from '../../../../lib/auth/auth-context';
import { caminhoInternoSeguro } from '../../../../lib/auth/destino';
import { confirmarContexto, prepararEntrada, type Entrada } from '../../../../lib/auth/entrada';
import { supabaseBrowser } from '../../../../lib/auth/supabase-browser';

type Estado =
  | { fase: 'processando' }
  | { fase: 'erro'; mensagem: string }
  | { fase: 'escolher'; entrada: Extract<Entrada, { tipo: 'escolher' }> };

function DestinoDoRetorno() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, loading } = useAuth();
  const [estado, setEstado] = useState<Estado>({ fase: 'processando' });
  const jaProcessou = useRef(false);

  useEffect(() => {
    if (loading || jaProcessou.current) return;
    jaProcessou.current = true;
    const next = caminhoInternoSeguro(params.get('next'));
    async function concluirRetorno() {
      // Se a inicialização do SDK falhou, o Supabase deixa o retorno no fragmento.
      // setSession valida os tokens com o Supabase antes de salvar a sessão.
      const url = new URL(window.location.href);
      const retorno = new URLSearchParams(url.hash.slice(1));
      const accessToken = retorno.get('access_token');
      const refreshToken = retorno.get('refresh_token');
      if (accessToken || refreshToken) {
        url.hash = '';
        window.history.replaceState(window.history.state, '', url);
      }

      if (accessToken && refreshToken && !retorno.has('error') && !retorno.has('error_code')) {
        const { data, error } = await supabaseBrowser.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error || !data.session) {
          setEstado({ fase: 'erro', mensagem: 'Não foi possível validar o retorno do Google. Volte ao login e tente novamente.' });
          return;
        }
      } else if (!session || accessToken || refreshToken) {
        setEstado({ fase: 'erro', mensagem: 'A sessão do Google está ausente ou incompleta. Volte ao login e tente novamente.' });
        return;
      }

      return prepararEntrada(next, { aposRegistro: true });
    }

    void concluirRetorno()
      .then((entrada) => {
        if (!entrada) return;
        if (entrada.tipo === 'ir') router.replace(entrada.destino);
        else if (entrada.tipo === 'escolher') setEstado({ fase: 'escolher', entrada });
        else if (entrada.tipo === 'sem-papel') router.replace(`/concluir-cadastro${next ? `?next=${encodeURIComponent(next)}` : ''}`);
        // 'conta-inativa': o provedor de acesso já tirou a pessoa da sessão e a levou ao login.
      })
      .catch(() => setEstado({ fase: 'erro', mensagem: 'Não foi possível concluir o login. Tente entrar de novo.' }));
  }, [loading, session, params, router]);

  if (estado.fase === 'escolher') {
    const { entrada } = estado;
    return (
      <EscolherContexto
        contextos={entrada.contextos}
        lembrado={entrada.lembrado}
        aoEscolher={async (c: ContextoListado) => {
          await confirmarContexto(entrada.authUid, semRotulo(c), entrada.contextos);
          router.replace(entrada.destino);
        }}
      />
    );
  }

  if (estado.fase === 'erro') {
    return (
      <AuthPagina titulo="Não foi possível entrar">
        <Notice tone="danger">{estado.mensagem}</Notice>
        <ButtonLink as={Link} href="/login" variant="primary">
          Voltar ao login
        </ButtonLink>
      </AuthPagina>
    );
  }

  return <AuthPagina titulo="Entrando no Nota A" descricao="Só um instante." />;
}

export default function DestinoPage() {
  return (
    <Suspense fallback={<AuthPagina titulo="Entrando no Nota A" descricao="Só um instante." />}>
      <DestinoDoRetorno />
    </Suspense>
  );
}
