'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AuthError } from '@supabase/supabase-js';
import { semRotulo, type ContextoListado } from '@notaa/contracts';
import { Button, Notice, Panel, TextField } from '@notaa/ui';
import { AuthPagina, IconeGoogle, SeparadorOu } from '../../components/auth';
import { EscolherContexto } from '../../components/EscolherContexto';
import { TelaCarregando } from '../../components/TelaCarregando';
import { useAuth } from '../../../lib/auth-context';
import { caminhoInternoSeguro } from '../../../lib/destino';
import { confirmarContexto, prepararEntrada, type Entrada } from '../../../lib/entrada';
import { supabaseBrowser } from '../../../lib/supabase-browser';

/** Texto de erro de login: diz o que fazer e não repassa a mensagem crua do Supabase. */
function mensagemDeLogin(error: AuthError): string {
  if (error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message)) {
    return 'Confirme o seu e-mail antes de entrar. O link está na sua caixa de entrada.';
  }
  if (error.status === 429 || error.code === 'over_request_rate_limit') {
    return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
  }
  if (error.status === 0 || /fetch|network/i.test(error.message)) {
    return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  }
  return 'E-mail ou senha incorretos. Confira os dados e tente de novo.';
}

type Fase = { fase: 'form' } | { fase: 'verificando' } | { fase: 'escolher'; entrada: Extract<Entrada, { tipo: 'escolher' }> };

function Entrar() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  // `next` só vale se for caminho interno e se o perfil tiver permissão (resolverDestino confere).
  // Aqui só se descarta o que nem é caminho, para o botão do Google não carregar lixo.
  const next = caminhoInternoSeguro(params.get('next'));
  const motivo = params.get('motivo');

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(
    motivo === 'conta-inativa' ? 'Sua conta está suspensa ou ainda não foi ativada. Fale com a sua instituição ou com o suporte do Nota A.' : null,
  );
  const [carregando, setCarregando] = useState(false);
  const [estado, setEstado] = useState<Fase>({ fase: 'form' });
  // Quem está no meio do envio do formulário cuida da própria navegação; o "já estava logado" espera.
  const emEntrada = useRef(false);
  const jaChecou = useRef(false);

  function aplicar(entrada: Entrada) {
    if (entrada.tipo === 'ir') {
      router.replace(entrada.destino);
    } else if (entrada.tipo === 'escolher') {
      setEstado({ fase: 'escolher', entrada });
    } else if (entrada.tipo === 'conta-inativa') {
      setEstado({ fase: 'form' });
      setErro('Sua conta está suspensa ou ainda não foi ativada. Fale com a sua instituição ou com o suporte do Nota A.');
    } else {
      setEstado({ fase: 'form' });
      setErro('Não foi possível confirmar o seu perfil agora. Tente entrar de novo em instantes.');
    }
  }

  // Quem já está logado e abre /login vai direto para a home do perfil (ou para o último acesso).
  useEffect(() => {
    if (authLoading || !session || emEntrada.current || jaChecou.current || motivo === 'conta-inativa') return;
    jaChecou.current = true;
    setEstado({ fase: 'verificando' });
    void prepararEntrada(next, { usarUltimo: true })
      .then(aplicar)
      .catch(() => {
        setEstado({ fase: 'form' });
      });
  }, [authLoading, session]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    emEntrada.current = true;

    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password: senha });
      if (error) {
        setErro(mensagemDeLogin(error));
        emEntrada.current = false;
        return;
      }
      aplicar(await prepararEntrada(next));
    } catch {
      setErro('Não foi possível entrar agora. Verifique a conexão e tente de novo.');
      emEntrada.current = false;
    } finally {
      setCarregando(false);
    }
  }

  async function entrarComGoogle() {
    setErro(null);
    setCarregando(true);
    const alvo = new URL('/auth/destino', window.location.origin);
    if (next) alvo.searchParams.set('next', next);
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: alvo.toString() },
    });
    if (error) {
      setErro('Não foi possível abrir o login com o Google. Tente de novo.');
      setCarregando(false);
    }
  }

  if (estado.fase === 'verificando' || (authLoading && !!session)) return <TelaCarregando rotulo="Entrando" />;

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

  return (
    <AuthPagina titulo="Entrar no Nota A">
      <Panel>
        <form onSubmit={onSubmit} className="flex flex-col gap-space-5">
          <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          {erro && <Notice tone="danger">{erro}</Notice>}

          <Button type="submit" variant="primary" className="w-full" loading={carregando}>
            {carregando ? 'Entrando' : 'Entrar'}
          </Button>
        </form>

        <div className="my-space-5">
          <SeparadorOu />
        </div>

        <Button type="button" variant="secondary" className="w-full" disabled={carregando} onClick={() => void entrarComGoogle()}>
          <IconeGoogle />
          Google
        </Button>
      </Panel>

      <p className="m-0 text-body-sm text-ink-muted">
        Ainda não tem conta?{' '}
        <Link href="/cadastro" className="font-bold text-primary underline">
          Criar conta
        </Link>
      </p>
    </AuthPagina>
  );
}

export default function LoginPage() {
  // useSearchParams exige um boundary de Suspense em páginas do App Router.
  return (
    <Suspense fallback={<TelaCarregando />}>
      <Entrar />
    </Suspense>
  );
}
