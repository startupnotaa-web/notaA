'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Label } from '@notaa/ui';
import { garantirRegistro } from '../../../lib/post-auth';
import { supabaseBrowser } from '../../../lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;

      await garantirRegistro();
      router.push('/dashboard');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-8">
      <h1 className="text-2xl font-bold">Entrar no Nota A</h1>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          {erro && (
            <p role="alert" className="text-sm text-error">
              {erro}
            </p>
          )}

          <Button type="submit" variant="cta" size="lg" fullWidth disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
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
      </Card>

      <p className="text-center text-sm text-text-muted">
        Ainda não tem conta?{' '}
        <Link href="/cadastro" className="text-brand-primary underline">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
