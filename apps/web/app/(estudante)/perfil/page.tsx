'use client';

import { useEffect, useState } from 'react';
import type { MeResponse, AchievementsResponse } from '@notaa/contracts';
import { Button, Card, CardHeader, Input, Label, SectionHeader, Skeleton, Badge, cn } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';
import { ShortcutCard } from '../../components/ShortcutCard';

const PLANO_ROTULO: Record<NonNullable<MeResponse['plano']>['tipo'], string> = {
  free: 'Gratuito',
  plus: 'Premium',
  escola: 'Escola',
};

export default function PerfilPage() {
  const { signOut } = useAuth();
  const [perfil, setPerfil] = useState<MeResponse | null>(null);
  const [achievements, setAchievements] = useState<AchievementsResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Estado do formulário de Informações Pessoais.
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null);

  // Mensagem da seção de assinatura
  const [assinaturaMsg, setAssinaturaMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<MeResponse>('/me'),
      apiFetch<AchievementsResponse>('/me/achievements')
    ])
      .then(([perfilData, achData]) => {
        setPerfil(perfilData);
        setNome(perfilData.nome ?? '');
        setAchievements(achData);
      })
      .catch((e) => {
        setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar seu perfil.');
      });
  }, []);

  async function handleSalvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setFeedback({ tipo: 'erro', msg: 'Informe seu nome.' });
      return;
    }
    setSalvando(true);
    setFeedback(null);
    try {
      const atualizado = await apiFetch<MeResponse>('/me', {
        method: 'PATCH',
        body: JSON.stringify({ nome: nomeLimpo }),
      });
      setPerfil(atualizado);
      setNome(atualizado.nome ?? '');
      setFeedback({ tipo: 'ok', msg: 'Informações salvas com sucesso.' });
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        msg: err instanceof ApiError ? err.message : 'Não foi possível salvar suas informações.',
      });
    } finally {
      setSalvando(false);
    }
  }

  if (erro) {
    return (
      <div className="p-4">
        <p role="alert" className="text-sm text-error">
          {erro}
        </p>
      </div>
    );
  }

  if (!perfil) {
    return <PerfilSkeleton />;
  }

  const planoTipo = perfil.plano?.tipo ?? 'free';
  const planoRotulo = PLANO_ROTULO[planoTipo];
  const isPremium = planoTipo === 'plus';
  const nomeInalterado = nome.trim() === (perfil.nome ?? '').trim();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4">
      {/* Header: Identidade */}
      <header className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-3xl font-bold text-white shadow-lg">
          {perfil.nome ? perfil.nome.charAt(0).toUpperCase() : 'N'}
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-text">{perfil.nome ? perfil.nome : 'Estudante Nota A'}</h1>
          <p className="text-sm font-medium text-text-muted">{perfil.email}</p>
          <div className="flex items-center gap-2 mt-1">
             <Badge variant="neutral" className="text-xs">
               Nível {perfil.gamificacao?.nivel?.atual || 1}
             </Badge>
             <Badge variant={perfil.plano?.status === 'ativa' ? 'brand' : 'neutral'} className="text-xs">
               Plano {planoRotulo}
             </Badge>
          </div>
        </div>
      </header>

      {/* Seção: Ferramentas Secundárias e Gamificação */}
      <section className="space-y-4">
        <SectionHeader title="Jornada &" accent="Conquistas" as="h2" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <ShortcutCard
            icon="🏆"
            title="Certificados"
            description="Conquistas e medalhas verificáveis da sua jornada."
            href="/certificados"
          />
          <ShortcutCard
            icon="📖"
            title="Minha Narrativa"
            description="Conecte seu sonho ao estudo e veja a timeline."
            href="/minha-narrativa"
          />
          <ShortcutCard
            icon="🗺️"
            title="Mapa do Conhecimento"
            description="Grafo visual das suas lacunas de estudo."
            href="/mapa-conhecimento"
          />
          <ShortcutCard
            icon="🎯"
            title="Previsão de Nota"
            description="IA prevê seu desempenho no SISU/ENEM."
            href="/previsao-nota"
          />
          <ShortcutCard
            icon="👨‍👩‍👧"
            title="Relatório Familiar"
            description="Boletim de progresso para pais e responsáveis."
            href="/relatorio-familiar"
          />
        </div>
      </section>

      {/* Seção: Galeria de Certificados de Ofensiva */}
      {achievements && (
        <section className="space-y-4">
          <SectionHeader title="Certificados de" accent="Ofensiva" as="h2" />
          <Card>
            <CardHeader>
              <div className="flex flex-wrap gap-4">
                {[
                  { dias: 3, label: '3 Dias', codigo: 'streak_3_dias' },
                  { dias: 7, label: '7 Dias', codigo: 'streak_7_dias' },
                  { dias: 15, label: '15 Dias', codigo: 'streak_15_dias' },
                  { dias: 30, label: '1 Mês', codigo: 'streak_30_dias' },
                  { dias: 60, label: '2 Meses', codigo: 'streak_60_dias' },
                  { dias: 120, label: '4 Meses', codigo: 'streak_120_dias' },
                  { dias: 240, label: '8 Meses', codigo: 'streak_240_dias' },
                ].map((marco) => {
                  const unlocked = achievements.desbloqueadas.some((a) => a.codigo === marco.codigo);
                  return (
                    <div
                      key={marco.codigo}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-xl border p-4 w-[110px] text-center transition-all',
                        unlocked
                          ? 'border-brand-primary/40 bg-brand-primary/10 shadow-[0_0_15px_rgba(38,153,233,0.15)]'
                          : 'border-border bg-surface-2 grayscale opacity-60'
                      )}
                    >
                      <span className="text-3xl mb-2" aria-hidden="true">
                        {unlocked ? '🏆' : '🔒'}
                      </span>
                      <span className={cn('text-xs font-bold uppercase', unlocked ? 'text-brand-primary' : 'text-text-muted')}>
                        {marco.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardHeader>
          </Card>
        </section>
      )}

      {/* Seção: Informações Pessoais (editável) */}
      <section className="space-y-4">
        <SectionHeader title="Informações" accent="Pessoais" as="h2" />
        <Card>
          <CardHeader>
            <form className="space-y-4" onSubmit={handleSalvarPerfil}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="perfil-nome">Nome</Label>
                  <Input
                    id="perfil-nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Como você quer ser chamado(a)"
                    maxLength={120}
                    autoComplete="name"
                    disabled={salvando}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="perfil-email">E-mail</Label>
                  <Input id="perfil-email" type="email" value={perfil.email} disabled readOnly />
                </div>
              </div>
              <div className="space-y-1.5">
                  <Label htmlFor="perfil-objetivo">Objetivo / Curso</Label>
                  <Input id="perfil-objetivo" value={perfil.objetivo || 'Não definido'} disabled readOnly />
                  <p className="text-[10px] text-text-muted mt-1">O objetivo e o e-mail não podem ser alterados diretamente. Entre em contato com o suporte.</p>
              </div>

              {feedback && (
                <p
                  role={feedback.tipo === 'erro' ? 'alert' : 'status'}
                  className={cn('text-sm', feedback.tipo === 'erro' ? 'text-error' : 'text-success')}
                >
                  {feedback.msg}
                </p>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={salvando || nomeInalterado}>
                  {salvando ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </div>
            </form>
          </CardHeader>
        </Card>
      </section>

      {/* Seção: Assinatura */}
      <section className="space-y-4">
        <SectionHeader title="Sua" accent="Assinatura" as="h2" />
        <Card className={cn('border-brand-primary/20', isPremium && 'bg-brand-primary/5')}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Plano atual</p>
                <p className="text-xl font-extrabold text-text">{planoRotulo}</p>
                {perfil.plano?.status && perfil.plano.status !== 'ativa' && (
                  <Badge variant="neutral">Status: {perfil.plano.status}</Badge>
                )}
              </div>
              <div className="flex w-full sm:w-auto flex-col gap-2 sm:flex-row">
                <Button
                  variant="cta"
                  className="w-full sm:w-auto"
                  disabled={isPremium}
                  onClick={() => setAssinaturaMsg('Os pagamentos chegam em breve — deixamos seu interesse no Premium registrado. 🚀')}
                >
                  {isPremium ? 'Você é Premium ✨' : 'Fazer Upgrade'}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto text-error hover:bg-error/10 hover:border-error/20"
                  disabled={!isPremium}
                  onClick={() => setAssinaturaMsg('O downgrade estará disponível assim que ativarmos os pagamentos.')}
                >
                  Cancelar
                </Button>
              </div>
            </div>

            {assinaturaMsg && (
              <p role="status" className="mt-4 text-sm text-text-muted">{assinaturaMsg}</p>
            )}
          </CardHeader>
        </Card>
      </section>

      {/* Danger Zone */}
      <section className="pt-8 border-t border-border mt-12 flex justify-center">
        <Button variant="secondary" onClick={signOut} className="text-text-muted hover:text-error transition-colors">
          Sair da Conta
        </Button>
      </section>
    </div>
  );
}

function PerfilSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2 w-full">
           <Skeleton className="h-8 w-1/3" />
           <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
