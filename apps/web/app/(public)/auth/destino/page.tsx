'use client';

// Destino do retorno do Google. Garante o registro, lê o papel do token e leva a pessoa à home do
// perfil dela (o aluno novo passa pelo onboarding), ou pergunta "Entrar como…" se a conta tem mais de
// um acesso. Fica fora do /login para que o redirecionamento do OAuth tenha um endereço fixo.
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { semRotulo, type ContextoListado } from '@notaa/contracts';
import { ButtonLink, Notice } from '@notaa/ui';
import { AuthPagina } from '../../../components/auth';
import { EscolherContexto } from '../../../components/EscolherContexto';
import { useAuth } from '../../../../lib/auth-context';
import { caminhoInternoSeguro } from '../../../../lib/destino';
import { confirmarContexto, prepararEntrada, type Entrada } from '../../../../lib/entrada';

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
    if (!session) {
      setEstado({ fase: 'erro', mensagem: 'Não foi possível concluir o login. Tente entrar de novo.' });
      return;
    }
    const next = caminhoInternoSeguro(params.get('next'));
    void prepararEntrada(next, { aposRegistro: true })
      .then((entrada) => {
        if (entrada.tipo === 'ir') router.replace(entrada.destino);
        else if (entrada.tipo === 'escolher') setEstado({ fase: 'escolher', entrada });
        else if (entrada.tipo === 'sem-papel') {
          setEstado({ fase: 'erro', mensagem: 'Não foi possível confirmar o seu perfil agora. Tente entrar de novo em instantes.' });
        }
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
