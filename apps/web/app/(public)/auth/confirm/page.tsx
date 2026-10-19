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
import { Button, Notice, Panel, TextField } from '@notaa/ui';
import { AuthPagina } from '../../../components/auth';
import { supabaseBrowser } from '../../../../lib/supabase-browser';
import { USER_STATE_STORAGE_KEY } from '../../../../lib/storage-keys';
import { garantirRegistro } from '../../../../lib/post-auth';
import { rotaPosRegistro } from '../../../../lib/rota-inicial';

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

    // Só navega DEPOIS do registro: na confirmação o token ainda não tem
    // `papel`, e ir direto para `next` abria o painel com /me recusando (401) —
    // o painel então mandava professor e instituição para o hub do aluno. O
    // destino sai do papel do token renovado; `next` fica só de reserva.
    async function seguirAposConfirmar() {
      await garantirRegistro();
      const { data } = await supabaseBrowser.auth.getSession();
      const papel = data.session?.user.app_metadata?.papel;
      router.replace(papel ? rotaPosRegistro(papel) : next);
    }

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
        await seguirAposConfirmar();
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
        await seguirAposConfirmar();
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

  if (estado.fase === 'processando') return <AuthPagina titulo="Confirmando seu e-mail" descricao="Só um instante." />;
  if (estado.fase === 'sucesso') return <AuthPagina titulo="E-mail confirmado" descricao="Levando você para o Nota A." />;

  return (
    <AuthPagina titulo="Não foi possível confirmar">
      <Notice tone="danger">{estado.mensagem}</Notice>
      <Panel>
        <form onSubmit={reenviar} className="flex flex-col gap-space-5">
          <TextField
            label="E-mail do cadastro"
            type="email"
            autoComplete="email"
            value={emailReenvio}
            onChange={(e) => setEmailReenvio(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" className="w-full" loading={reenviando}>
            {reenviando ? 'Reenviando' : 'Reenviar link de confirmação'}
          </Button>
          {reenviado && (
            <Notice tone="success">
              Se este e-mail tiver um cadastro pendente, um novo link foi enviado. Abra o mais recente.
            </Notice>
          )}
        </form>
      </Panel>
      <p className="m-0 text-body-sm text-ink-muted">
        Já confirmou antes?{' '}
        <Link href="/login" className="font-bold text-primary underline">
          Ir para o login
        </Link>
      </p>
    </AuthPagina>
  );
}

export default function AuthConfirmPage() {
  // useSearchParams exige um boundary de Suspense em páginas do App Router.
  return (
    <Suspense fallback={<AuthPagina titulo="Confirmando seu e-mail" descricao="Só um instante." />}>
      <ConfirmarEmail />
    </Suspense>
  );
}
