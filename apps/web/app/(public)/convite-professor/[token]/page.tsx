'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { PreviaConviteProfessor } from '@notaa/contracts';
import { Button, Chip, Notice, Panel, TextField } from '@notaa/ui';
import { AuthPagina } from '../../../components/auth';
import { ApiError, apiFetch } from '../../../../lib/api-client';
import { supabaseBrowser } from '../../../../lib/supabase-browser';

/**
 * Página que o professor abre a partir do link de convite da instituição.
 *
 * Fica em `(public)` porque roda antes de a conta existir. Quem autoriza é o
 * token na URL: nem o papel nem a instituição são escolhidos aqui, os dois vêm
 * do convite no servidor. Por isso esta tela não tem seletor de perfil — se
 * tivesse, qualquer pessoa se declararia professor de qualquer instituição.
 */

type Estado =
  | { fase: 'carregando' }
  | { fase: 'conviteInvalido'; mensagem: string }
  | { fase: 'formulario'; previa: PreviaConviteProfessor }
  | { fase: 'aguardandoConfirmacao' };

export default function ConviteProfessorPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' });
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      try {
        const previa = await apiFetch<PreviaConviteProfessor>(
          `/convite-professor/${encodeURIComponent(token)}`,
        );
        if (cancelado) return;
        setEstado({ fase: 'formulario', previa });
        // Convite feito para um e-mail específico já vem preenchido, mas segue
        // editável: o e-mail é registro de quem foi convidado, não credencial.
        if (previa.email) setEmail(previa.email);
      } catch (e) {
        if (cancelado) return;
        setEstado({
          fase: 'conviteInvalido',
          mensagem:
            e instanceof ApiError
              ? e.message
              : 'Não foi possível verificar este convite. Tente novamente mais tarde.',
        });
      }
    }
    void carregar();
    return () => {
      cancelado = true;
    };
  }, [token]);

  async function criarConta(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password: senha,
        // `tokenConviteProfessor` viaja no user_metadata porque, se o projeto
        // exigir confirmação de e-mail, quem termina o registro é o login
        // seguinte — e a essa altura a URL do convite já se foi.
        options: {
          data: { nome, tokenConviteProfessor: token },
          emailRedirectTo: `${window.location.origin}/convite-professor/${token}`,
        },
      });
      if (error) throw error;

      // O Supabase não revela que um e-mail já existe: devolve "sucesso" com
      // sessão nula, igual ao caso de confirmação pendente. O que distingue os
      // dois é `identities` vazio, que só aparece quando a conta já existia.
      //
      // Isso precisa ser tratado aqui porque, por regra de produto, uma conta é
      // um papel só: quem já tem conta na plataforma não pode virar professor
      // institucional pela mesma conta, precisa de outra.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        setErro(
          'Este e-mail já tem conta no Nota A. Uma conta é de um papel só, então o professor institucional precisa de um e-mail próprio. Use outro e-mail neste convite.',
        );
        return;
      }

      if (!data.session) {
        setEstado({ fase: 'aguardandoConfirmacao' });
        return;
      }

      await apiFetch('/convite-professor/registrar', {
        method: 'POST',
        body: JSON.stringify({ nome, email, token }),
      });
      await supabaseBrowser.auth.refreshSession();
      router.push('/professor');
    } catch (e) {
      setErro(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Não foi possível criar sua conta.',
      );
    } finally {
      setEnviando(false);
    }
  }

  if (estado.fase === 'carregando') {
    return <AuthPagina titulo="Verificando convite" descricao="Só um instante." />;
  }

  if (estado.fase === 'conviteInvalido') {
    return (
      <AuthPagina titulo="Convite indisponível">
        <Notice tone="danger">{estado.mensagem}</Notice>
        <p className="m-0 text-body-sm text-ink-muted">
          Já tem conta?{' '}
          <Link href="/login" className="font-bold text-primary underline">
            Ir para o login
          </Link>
        </p>
      </AuthPagina>
    );
  }

  if (estado.fase === 'aguardandoConfirmacao') {
    return (
      <AuthPagina
        titulo="Confirme seu e-mail"
        descricao={
          <>
            Enviamos um link para <strong className="text-ink">{email}</strong>. Depois de confirmar, abra este convite
            novamente para concluir o cadastro.
          </>
        }
      />
    );
  }

  return (
    <AuthPagina
      titulo={estado.previa.instituicaoNome}
      descricao="Crie sua conta de professor. Você vai lecionar nas turmas que a instituição atribuir a você."
    >
      <div>
        <Chip tone="brand">Convite para lecionar</Chip>
      </div>
      <Panel>
        <form onSubmit={criarConta} className="flex flex-col gap-space-5">
          <TextField label="Nome" autoComplete="name" value={nome} onChange={(ev) => setNome(ev.target.value)} required />
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            hint="Use um e-mail que ainda não tenha conta no Nota A. Cada conta tem um papel só, então a conta de professor da instituição é separada de qualquer outra que você já use."
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="new-password"
            hint="Use pelo menos 6 caracteres."
            minLength={6}
            value={senha}
            onChange={(ev) => setSenha(ev.target.value)}
            required
          />

          {erro && <Notice tone="danger">{erro}</Notice>}

          <Button type="submit" variant="primary" className="w-full" loading={enviando}>
            {enviando ? 'Criando conta' : 'Criar conta de professor'}
          </Button>
        </form>
      </Panel>

      <p className="m-0 text-body-sm text-ink-muted">
        Já tem conta?{' '}
        <Link href="/login" className="font-bold text-primary underline">
          Entrar
        </Link>
      </p>
    </AuthPagina>
  );
}
