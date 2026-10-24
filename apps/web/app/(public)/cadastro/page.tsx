'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, ButtonLink, Notice, Panel, TextField } from '@notaa/ui';
import { AuthPagina, IconeGoogle, SeparadorOu } from '../../components/auth';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { supabaseBrowser } from '../../../lib/supabase-browser';

type TipoPerfilPublico = 'estudante' | 'professor_independente' | 'instituicao';

const TIPOS: { valor: TipoPerfilPublico; label: string }[] = [
  { valor: 'estudante', label: 'Sou estudante' },
  { valor: 'professor_independente', label: 'Sou professor(a) independente' },
  { valor: 'instituicao', label: 'Represento uma instituição' },
];

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipoPerfil, setTipoPerfil] = useState<TipoPerfilPublico>('estudante');
  const [nomeInstituicao, setNomeInstituicao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // O onboarding de 8 passos é do estudante. Instituição vai direto para o painel
  // dela; professor independente, para o painel do professor.
  const destinoAposCadastro =
    tipoPerfil === 'instituicao'
      ? '/instituicao'
      : tipoPerfil === 'professor_independente'
        ? '/professor'
        : '/onboarding';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password: senha,
        options: {
          // `nomeInstituicao` vai junto no user_metadata porque, se o projeto exigir
          // confirmação de e-mail, quem chama /auth/register é o login seguinte
          // (lib/post-auth.ts) — e a essa altura o formulário já não existe mais.
          data: tipoPerfil === 'instituicao' ? { nome, tipoPerfil, nomeInstituicao } : { nome, tipoPerfil },
          // /auth/confirm trata sucesso E erro do link (token expirado, path
          // inválido) — antes o erro chegava em /onboarding no fragment #... e
          // era ignorado, deixando o usuário na sessão antiga do dispositivo.
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${destinoAposCadastro}`,
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
        body: JSON.stringify(
          tipoPerfil === 'instituicao' ? { nome, email, tipoPerfil, nomeInstituicao } : { nome, email, tipoPerfil },
        ),
      });
      await supabaseBrowser.auth.refreshSession();
      router.push(destinoAposCadastro);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao cadastrar.');
    } finally {
      setCarregando(false);
    }
  }

  if (aguardandoConfirmacao) {
    return (
      <AuthPagina
        titulo="Confirme seu e-mail"
        descricao={
          <>
            Enviamos um link de confirmação para <strong className="text-ink">{email}</strong>. Depois de confirmar, entre
            normalmente.
          </>
        }
      >
        <div>
          <ButtonLink as={Link} href="/login" variant="primary">
            Ir para o login
          </ButtonLink>
        </div>
      </AuthPagina>
    );
  }

  return (
    <AuthPagina titulo="Criar conta no Nota A">
      <Panel>
        <form onSubmit={onSubmit} className="flex flex-col gap-space-5">
          <TextField label="Nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField
            label="Senha"
            type="password"
            autoComplete="new-password"
            hint="Use pelo menos 6 caracteres."
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <fieldset className="m-0 flex flex-col gap-space-1 border-0 p-0">
            <legend className="mb-space-2 p-0 text-label text-ink">Você é</legend>
            {TIPOS.map((t) => (
              <label key={t.valor} className="flex min-h-[44px] cursor-pointer items-center gap-space-3 text-body text-ink">
                <input
                  type="radio"
                  name="tipoPerfil"
                  value={t.valor}
                  checked={tipoPerfil === t.valor}
                  onChange={() => setTipoPerfil(t.valor)}
                  className="h-5 w-5 accent-primary"
                />
                {t.label}
              </label>
            ))}
          </fieldset>

          {tipoPerfil === 'instituicao' && (
            <TextField
              label="Nome da instituição"
              value={nomeInstituicao}
              onChange={(e) => setNomeInstituicao(e.target.value)}
              placeholder="Ex.: Colégio Dom Bosco"
              hint="É com este nome que a instituição será criada e que seus alunos vão encontrá-la para se vincular."
              minLength={2}
              maxLength={160}
              required
            />
          )}

          {erro && <Notice tone="danger">{erro}</Notice>}

          <Button type="submit" variant="primary" className="w-full" loading={carregando}>
            {carregando ? 'Criando conta' : 'Criar conta'}
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
              options: {
                redirectTo: `${window.location.origin}/auth/destino`,
              },
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
        Já tem conta?{' '}
        <Link href="/login" className="font-bold text-primary underline">
          Entrar
        </Link>
      </p>
    </AuthPagina>
  );
}
