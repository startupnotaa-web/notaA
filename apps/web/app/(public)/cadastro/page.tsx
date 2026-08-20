'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Label } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { supabaseBrowser } from '../../../lib/supabase-browser';

type TipoPerfilPublico = 'estudante' | 'professor' | 'escola';

const TIPOS: { valor: TipoPerfilPublico; label: string }[] = [
  { valor: 'estudante', label: 'Sou estudante' },
  { valor: 'professor', label: 'Sou professor(a)' },
  { valor: 'escola', label: 'Represento uma escola' },
];

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipoPerfil, setTipoPerfil] = useState<TipoPerfilPublico>('estudante');
  const [erro, setErro] = useState<string | null>(null);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password: senha,
        options: {
          data: { nome, tipoPerfil },
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) throw error;

      if (!data.session) {
        // Projeto exige confirmação de e-mail — não há token ainda para
        // chamar /auth/register ainda; o login fará isso depois (lib/post-auth).
        setAguardandoConfirmacao(true);
        return;
      }

      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nome, email, tipoPerfil }),
      });
      await supabaseBrowser.auth.refreshSession();
      router.push('/onboarding');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao cadastrar.');
    } finally {
      setCarregando(false);
    }
  }

  if (aguardandoConfirmacao) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <Card className="space-y-3 p-6">
          <h1 className="text-xl font-bold">Confirme seu e-mail</h1>
          <p className="text-text-muted">
            Enviamos um link de confirmação para <strong className="text-text">{email}</strong>. Depois de
            confirmar, faça login normalmente.
          </p>
          <Button asChild variant="primary" fullWidth>
            <Link href="/login">Ir para o login</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-8">
      <h1 className="text-2xl font-bold">Criar conta no Nota A</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-text">Você é...</legend>
          {TIPOS.map((t) => (
            <label key={t.valor} className="flex items-center gap-2 text-sm text-text">
              <input
                type="radio"
                name="tipoPerfil"
                value={t.valor}
                checked={tipoPerfil === t.valor}
                onChange={() => setTipoPerfil(t.valor)}
              />
              {t.label}
            </label>
          ))}
        </fieldset>

        {erro && (
          <p role="alert" className="text-sm text-error">
            {erro}
          </p>
        )}

        <Button type="submit" variant="cta" size="lg" fullWidth disabled={carregando}>
          {carregando ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted uppercase tracking-wider">ou continue com</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        fullWidth
        disabled={carregando}
        onClick={async () => {
          setErro(null);
          setCarregando(true);
          const { error } = await supabaseBrowser.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/onboarding`,
            },
          });
          if (error) {
            setErro('Erro ao redirecionar para o Google.');
            setCarregando(false);
          }
        }}
      >
        <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" fill="currentColor">
          <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
        </svg>
        Google
      </Button>

      <p className="text-center text-sm text-text-muted">
        Já tem conta?{' '}
        <Link href="/login" className="text-brand-primary underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
