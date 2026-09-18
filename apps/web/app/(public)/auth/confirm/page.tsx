'use client';

// Destino do link de confirmação de e-mail (template "Confirm signup" do
// Supabase). Dois formatos aceitos:
//   1. Novo (recomendado): ?token_hash={{ .TokenHash }}&type=email — o token só
//      é consumido pelo verifyOtp explícito, então prefetch de scanners de
//      e-mail não o invalida.
//   2. Legado ({{ .ConfirmationURL }}): tokens ou erro chegam no hash (#...) —
//      o SDK processa sucesso sozinho; o erro é exibido aqui em vez de ser
//      engolido (antes o usuário caía em /onboarding com a sessão antiga de
//      outro usuário deste dispositivo).
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { Button, Card, Input, Label } from '@notaa/ui';
import { supabaseBrowser } from '../../../../lib/supabase-browser';
import { USER_STATE_STORAGE_KEY } from '../../../../lib/storage-keys';

const TIPOS_OTP: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

type Estado =
  | { fase: 'processando' }
  | { fase: 'sucesso' }
  | { fase: 'erro'; mensagem: string };

function ConfirmarEmail() {
  const router = useRouter();
  const params = useSearchParams();
  const [estado, setEstado] = useState<Estado>({ fase: 'processando' });
  const [emailReenvio, setEmailReenvio] = useState('');
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  // O token é de uso único: o guard impede o segundo verifyOtp do StrictMode
  // (dev), que consumiria "de novo" o token e mostraria erro após o sucesso.
  const jaProcessou = useRef(false);

  const next = params.get('next') ?? '/onboarding';

  useEffect(() => {
    if (jaProcessou.current) return;
    jaProcessou.current = true;

    async function confirmar() {
      const tokenHash = params.get('token_hash');
      const tipoParam = params.get('type');
      const tipo: EmailOtpType = TIPOS_OTP.includes(tipoParam as EmailOtpType)
        ? (tipoParam as EmailOtpType)
        : 'email';

      if (tokenHash) {
        // Limpa a sessão local ANTES de verificar: se outra conta estava logada
        // neste dispositivo, é ela que o app renderizaria em caso de falha — e o
        // snapshot de XP/perfil dela não pode vazar para a conta nova.
        // scope 'local' não revoga os tokens da outra conta em outros aparelhos.
        try {
          localStorage.removeItem(USER_STATE_STORAGE_KEY);
        } catch {
          // Storage indisponível — nada a limpar.
        }
        await supabaseBrowser.auth.signOut({ scope: 'local' });

        const { error } = await supabaseBrowser.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
        if (error) {
          setEstado({
            fase: 'erro',
            mensagem:
              'Este link de confirmação é inválido ou já expirou. Peça um novo link abaixo e abra o e-mail mais recente.',
          });
          return;
        }
        setEstado({ fase: 'sucesso' });
        router.replace(next);
        return;
      }

      // Sem token_hash: fluxo legado via {{ .ConfirmationURL }} — o resultado
      // (tokens ou erro) vem no fragment #..., que nunca chega ao servidor.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const descricaoErro = hash.get('error_description');
      if (descricaoErro) {
        setEstado({
          fase: 'erro',
          mensagem: /invalid|expired/i.test(descricaoErro)
            ? 'Este link de confirmação é inválido ou já expirou. Peça um novo link abaixo e abra o e-mail mais recente.'
            : `Não foi possível confirmar o e-mail: ${descricaoErro}`,
        });
        return;
      }

      if (hash.get('access_token')) {
        // O SDK (detectSessionInUrl) cria a sessão a partir do hash; o
        // AuthProvider reage ao SIGNED_IN e redireciona. Só confirmamos aqui.
        setEstado({ fase: 'sucesso' });
        router.replace(next);
        return;
      }

      setEstado({
        fase: 'erro',
        mensagem: 'Link de confirmação incompleto. Abra o link diretamente do e-mail, sem copiá-lo parcialmente.',
      });
    }

    void confirmar();
  }, [params, router, next]);

  async function reenviar(e: React.FormEvent) {
    e.preventDefault();
    setReenviando(true);
    setReenviado(false);
    const { error } = await supabaseBrowser.auth.resend({
      type: 'signup',
      email: emailReenvio,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}` },
    });
    setReenviando(false);
    if (error) {
      setEstado({ fase: 'erro', mensagem: 'Não foi possível reenviar o e-mail. Confira o endereço e tente de novo.' });
      return;
    }
    setReenviado(true);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Card className="w-full space-y-4 p-6">
        {estado.fase === 'processando' && (
          <>
            <h1 className="text-xl font-bold">Confirmando seu e-mail...</h1>
            <p className="text-text-muted">Só um instante.</p>
          </>
        )}

        {estado.fase === 'sucesso' && (
          <>
            <h1 className="text-xl font-bold">E-mail confirmado!</h1>
            <p className="text-text-muted">Levando você para o Nota A...</p>
          </>
        )}

        {estado.fase === 'erro' && (
          <>
            <h1 className="text-xl font-bold">Não foi possível confirmar</h1>
            <p role="alert" className="text-sm text-error">
              {estado.mensagem}
            </p>

            <form onSubmit={reenviar} className="space-y-3 text-left">
              <div className="space-y-1">
                <Label htmlFor="email-reenvio">E-mail do cadastro</Label>
                <Input
                  id="email-reenvio"
                  type="email"
                  value={emailReenvio}
                  onChange={(e) => setEmailReenvio(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="primary" fullWidth disabled={reenviando}>
                {reenviando ? 'Reenviando...' : 'Reenviar link de confirmação'}
              </Button>
              {reenviado && (
                <p className="text-sm text-text-muted">
                  Se este e-mail tiver um cadastro pendente, um novo link foi enviado. Abra o mais recente.
                </p>
              )}
            </form>

            <p className="text-sm text-text-muted">
              Já confirmou antes?{' '}
              <Link href="/login" className="text-brand-primary underline">
                Ir para o login
              </Link>
            </p>
          </>
        )}
      </Card>
    </main>
  );
}

export default function AuthConfirmPage() {
  // useSearchParams exige um boundary de Suspense em páginas do App Router.
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6">
          <Card className="w-full space-y-3 p-6 text-center">
            <h1 className="text-xl font-bold">Confirmando seu e-mail...</h1>
          </Card>
        </main>
      }
    >
      <ConfirmarEmail />
    </Suspense>
  );
}
