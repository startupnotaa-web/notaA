'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { PreviaConviteProfessor } from '@notaa/contracts';
import { Button, Card, Input, Label } from '@notaa/ui';
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-8">
      {estado.fase === 'carregando' && (
        <Card className="space-y-2 p-6 text-center">
          <h1 className="text-xl font-bold text-text">Verificando convite…</h1>
          <p className="text-text-muted">Só um instante.</p>
        </Card>
      )}

      {estado.fase === 'conviteInvalido' && (
        <Card className="space-y-3 p-6 text-center">
          <h1 className="text-xl font-bold text-text">Convite indisponível</h1>
          <p role="alert" className="text-sm text-error">
            {estado.mensagem}
          </p>
          <p className="text-sm text-text-muted">
            Já tem conta?{' '}
            <Link href="/login" className="text-brand-primary underline">
              Ir para o login
            </Link>
          </p>
        </Card>
      )}

      {estado.fase === 'aguardandoConfirmacao' && (
        <Card className="space-y-3 p-6 text-center">
          <h1 className="text-xl font-bold text-text">Confirme seu e-mail</h1>
          <p className="text-text-muted">
            Enviamos um link para <strong className="text-text">{email}</strong>. Depois de
            confirmar, abra este convite novamente para concluir o cadastro.
          </p>
        </Card>
      )}

      {estado.fase === 'formulario' && (
        <>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
              Convite para lecionar
            </p>
            <h1 className="text-2xl font-bold text-text">{estado.previa.instituicaoNome}</h1>
            <p className="text-sm text-text-muted">
              Crie sua conta de professor. Você vai lecionar nas turmas que a instituição atribuir a
              você.
            </p>
            <p className="text-xs text-text-muted">
              Use um e-mail que ainda não tenha conta no Nota A. Cada conta tem um papel só, então a
              conta de professor da instituição é separada de qualquer outra que você já use.
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={criarConta} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={(ev) => setNome(ev.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  minLength={6}
                  value={senha}
                  onChange={(ev) => setSenha(ev.target.value)}
                  required
                />
              </div>

              {erro && (
                <p role="alert" className="text-sm text-error">
                  {erro}
                </p>
              )}

              <Button type="submit" variant="cta" size="lg" fullWidth disabled={enviando}>
                {enviando ? 'Criando conta…' : 'Criar conta de professor'}
              </Button>
            </form>
          </Card>

          <p className="text-center text-sm text-text-muted">
            Já tem conta?{' '}
            <Link href="/login" className="text-brand-primary underline">
              Entrar
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
