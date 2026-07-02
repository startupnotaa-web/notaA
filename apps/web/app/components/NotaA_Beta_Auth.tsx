'use client';

import React, { useState } from 'react';
import { cn } from '@notaa/ui';

type AuthView = 'login' | 'cadastro' | 'recuperar' | 'sucesso';
type Perfil = 'estudante' | 'professor' | 'escola';

// --- COMPONENTES INTERNOS REUTILIZÁVEIS --- //

function Spin() {
  return (
    <svg className="h-4 w-4 animate-spin text-current" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function CustomBtn({
  children,
  loading,
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: 'primary' | 'secondary' | 'outline' }) {
  const baseStyle = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary: "bg-brand-secondary text-white hover:brightness-110",
    secondary: "bg-surface-2 text-text hover:bg-border",
    outline: "border border-border bg-transparent hover:bg-surface-2 text-text",
  };

  // O "glow neon" e o gradiente da marca são aplicados no botão primário
  const isPrimary = variant === 'primary';

  return (
    <button
      className={cn(baseStyle, variants[variant], isPrimary && 'bg-gradient-brand shadow-brand border-none', className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spin />}
      {children}
    </button>
  );
}

function CustomInput({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <div className="flex w-full flex-col gap-1.5 text-left">
      <label className="text-sm font-medium text-text">{label}</label>
      <input
        className={cn(
          "h-10 w-full rounded-md border border-border bg-bg/50 px-3 text-sm text-text placeholder:text-text-muted transition-colors focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus",
          error && "border-error focus:border-error focus:ring-error"
        )}
        {...props}
      />
      {error && <span className="text-xs font-medium text-error mt-0.5 animate-in slide-in-from-top-1">{error}</span>}
    </div>
  );
}

function Divider({ text }: { text: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-text-muted uppercase tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// --- CONTAINER DE AUTENTICAÇÃO CENTRAL --- //

const PERFIS: { id: Perfil; label: string; icon: string }[] = [
  { id: 'estudante', label: 'Estudante', icon: '🎓' },
  { id: 'professor', label: 'Professor', icon: '👨‍🏫' },
  { id: 'escola', label: 'Escola', icon: '🏫' },
];

export function NotaABetaAuth() {
  const [view, setView] = useState<AuthView>('login');
  const [loading, setLoading] = useState(false);

  // Estados: Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Estados: Cadastro
  const [cadNome, setCadNome] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadPass, setCadPass] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('estudante');
  const [cadErrors, setCadErrors] = useState<{ nome?: string; email?: string; pass?: string }>({});

  // Estados: Recuperar
  const [recEmail, setRecEmail] = useState('');

  // Handlers simulados
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setView('sucesso');
    }, 1500);
  };

  const handleCadastro = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { nome?: string; email?: string; pass?: string } = {};

    if (!cadNome.trim()) errors.nome = 'O nome é obrigatório.';
    if (!cadEmail.includes('@')) errors.email = 'Insira um e-mail válido.';
    if (cadPass.length < 6) errors.pass = 'A senha deve ter no mínimo 6 caracteres.';

    if (Object.keys(errors).length > 0) {
      setCadErrors(errors);
      return;
    }
    setCadErrors({});
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setView('sucesso');
    }, 1500);
  };

  const handleRecuperar = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setView('login');
    }, 1500);
  };

  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    // Para resolver o "supabaseBrowser não existe neste escopo", precisamos garantir a importação.
    // Mas, como já podemos importar no topo, usaremos a função import dinâmica temporariamente ou a importaremos no arquivo real se puder
    const { supabaseBrowser } = await import('../../lib/supabase-browser');
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      console.error('Google login error:', error);
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all">
      
      {/* VIEW: LOGIN */}
      {view === 'login' && (
        <form onSubmit={handleLogin} className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-2 text-center">
            <h2 className="text-2xl font-bold text-text">Bem-vindo de volta</h2>
            <p className="text-sm text-text-muted">Acesse para continuar sua evolução.</p>
          </div>

          <CustomInput
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <CustomInput
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setView('recuperar')}
              className="self-end text-xs font-medium text-text-muted hover:text-focus transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>

          <CustomBtn type="submit" loading={loading} className="mt-2 w-full text-base">
            Entrar
          </CustomBtn>

          <Divider text="ou continue com" />

          <CustomBtn type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} loading={loadingGoogle}>
            <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" fill="currentColor">
              <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
            </svg>
            Login com Google
          </CustomBtn>

          <p className="mt-4 text-center text-sm text-text-muted">
            Não tem uma conta?{' '}
            <button
              type="button"
              onClick={() => setView('cadastro')}
              className="font-semibold text-focus hover:underline"
            >
              Cadastre-se
            </button>
          </p>
        </form>
      )}

      {/* VIEW: CADASTRO */}
      {view === 'cadastro' && (
        <form onSubmit={handleCadastro} className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-2 text-center">
            <h2 className="text-2xl font-bold text-text">Crie sua conta</h2>
            <p className="text-sm text-text-muted">Junte-se à revolução gamificada.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-text">Selecione seu perfil:</label>
            <div className="grid grid-cols-3 gap-2">
              {PERFIS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPerfil(p.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-xs transition-all",
                    perfil === p.id
                      ? "border-focus bg-focus/10 text-focus shadow-[0_0_12px_rgba(143,196,255,0.2)]"
                      : "border-border bg-surface-2 text-text hover:border-text-muted"
                  )}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <CustomInput
            label="Nome completo"
            placeholder="Seu nome"
            value={cadNome}
            onChange={(e) => {
              setCadNome(e.target.value);
              setCadErrors((prev) => ({ ...prev, nome: undefined }));
            }}
            error={cadErrors.nome}
          />
          <CustomInput
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={cadEmail}
            onChange={(e) => {
              setCadEmail(e.target.value);
              setCadErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={cadErrors.email}
          />
          <CustomInput
            label="Senha"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={cadPass}
            onChange={(e) => {
              setCadPass(e.target.value);
              setCadErrors((prev) => ({ ...prev, pass: undefined }));
            }}
            error={cadErrors.pass}
          />

          <CustomBtn type="submit" loading={loading} className="mt-2 w-full text-base">
            Cadastrar
          </CustomBtn>

          <p className="mt-2 text-center text-sm text-text-muted">
            Já tem uma conta?{' '}
            <button
              type="button"
              onClick={() => setView('login')}
              className="font-semibold text-focus hover:underline"
            >
              Entrar
            </button>
          </p>
        </form>
      )}

      {/* VIEW: RECUPERAR SENHA */}
      {view === 'recuperar' && (
        <form onSubmit={handleRecuperar} className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-2 text-center">
            <h2 className="text-2xl font-bold text-text">Recuperar senha</h2>
            <p className="text-sm text-text-muted">Enviaremos um link de redefinição para o seu e-mail.</p>
          </div>

          <CustomInput
            label="E-mail cadastrado"
            type="email"
            placeholder="seu@email.com"
            value={recEmail}
            onChange={(e) => setRecEmail(e.target.value)}
            required
          />

          <CustomBtn type="submit" loading={loading} className="mt-4 w-full text-base">
            Enviar link de redefinição
          </CustomBtn>

          <button
            type="button"
            onClick={() => setView('login')}
            className="mt-2 text-sm font-medium text-text-muted hover:text-focus transition-colors"
          >
            Voltar para o Login
          </button>
        </form>
      )}

      {/* VIEW: SUCESSO */}
      {view === 'sucesso' && (
        <div className="flex flex-col items-center justify-center gap-4 py-12 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/20 text-success shadow-[0_0_24px_rgba(61,220,151,0.3)]">
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10 animate-[bounce_1s_ease-in-out]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text">Sucesso!</h2>
          <p className="text-center text-sm text-text-muted">
            Sua identidade foi confirmada.<br />Preparando o ambiente...
          </p>
          
          {/* Animated loading dots */}
          <div className="mt-4 flex gap-2">
            <div className="h-2 w-2 animate-bounce rounded-full bg-brand-primary" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-brand-secondary" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-brand-accent" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );
}
