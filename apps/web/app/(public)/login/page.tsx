'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Notice, Panel, TextField } from '@notaa/ui';
import { AuthPagina, IconeGoogle, SeparadorOu } from '../../components/auth';
import { garantirRegistro } from '../../../lib/post-auth';
import { rotaInicialPorPapel } from '../../../lib/rota-inicial';
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
      // Lê o papel DEPOIS do garantirRegistro, que é quem o escreve no token na
      // primeira entrada. Sem isso, um professor recém-confirmado cairia no hub
      // do aluno nesta sessão.
      const { data } = await supabaseBrowser.auth.getSession();
      router.push(rotaInicialPorPapel(data.session?.user.app_metadata?.papel));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setCarregando(false);
    }
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

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={carregando}
          onClick={async () => {
            setErro(null);
            setCarregando(true);
            const { error } = await supabaseBrowser.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `${window.location.origin}/onboarding` },
            });
            if (error) {
              setErro('Não foi possível abrir o login com o Google. Tente de novo.');
              setCarregando(false);
            }
          }}
        >
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
