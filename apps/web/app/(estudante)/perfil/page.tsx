'use client';

import { useEffect, useState } from 'react';
import type { MeResponse, Eixo4D } from '@notaa/contracts';
import { Button, Card, CardHeader, Input, Label, SectionHeader, Skeleton, Badge, cn } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';

const PLANO_ROTULO: Record<NonNullable<MeResponse['plano']>['tipo'], string> = {
  free: 'Gratuito',
  plus: 'Premium',
  escola: 'Escola',
};

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<MeResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Estado do formulário de Informações Pessoais.
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null);

  // Mensagem da seção de assinatura (botões ainda são stubs — sem billing).
  const [assinaturaMsg, setAssinaturaMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<MeResponse>('/me')
      .then((data) => {
        setPerfil(data);
        setNome(data.nome ?? '');
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

  const { gamificacao, perfilCognitivo } = perfil;
  const planoTipo = perfil.plano?.tipo ?? 'free';
  const planoRotulo = PLANO_ROTULO[planoTipo];
  const isPremium = planoTipo === 'plus';
  const nomeInalterado = nome.trim() === (perfil.nome ?? '').trim();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
      {/* Header: Identidade e Plano */}
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-text-muted">Seu Perfil</p>
          <h1 className="text-2xl font-bold">{perfil.nome ? perfil.nome : 'Estudante Nota A'}</h1>
          <p className="text-sm font-medium text-text">
            {perfil.email}
          </p>
        </div>
        <Badge variant={perfil.plano?.status === 'ativa' ? 'brand' : 'neutral'}>
          {`Plano ${planoRotulo}`}
        </Badge>
      </header>

      {/* Seção 1: Informações Pessoais (editável) */}
      <section className="space-y-3">
        <SectionHeader
          title="Informações"
          accent="Pessoais"
          description="Mantenha seus dados de cadastro atualizados."
          as="h2"
        />
        <Card>
          <CardHeader>
            <form className="space-y-4" onSubmit={handleSalvarPerfil}>
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
                <p className="text-xs text-text-muted">
                  O e-mail é sua credencial de acesso e não pode ser alterado por aqui.
                </p>
              </div>

              {feedback && (
                <p
                  role={feedback.tipo === 'erro' ? 'alert' : 'status'}
                  className={cn('text-sm', feedback.tipo === 'erro' ? 'text-error' : 'text-success')}
                >
                  {feedback.msg}
                </p>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={salvando || nomeInalterado}>
                  {salvando ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </div>
            </form>
          </CardHeader>
        </Card>
      </section>

      {/* Seção 2: Gerenciamento de Assinatura */}
      <section className="space-y-3">
        <SectionHeader
          title="Sua"
          accent="Assinatura"
          description="Gerencie seu plano e desbloqueie todo o potencial da Nota A."
          as="h2"
        />
        <Card className={cn('border-brand-primary/20', isPremium && 'bg-brand-primary/5')}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
                  Plano atual
                </p>
                <p className="text-xl font-extrabold text-text">{planoRotulo}</p>
                {perfil.plano?.status && perfil.plano.status !== 'ativa' && (
                  <Badge variant="neutral">Status: {perfil.plano.status}</Badge>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="cta"
                  disabled={isPremium}
                  onClick={() =>
                    setAssinaturaMsg(
                      'Os pagamentos chegam em breve — deixamos seu interesse no Premium registrado. 🚀',
                    )
                  }
                >
                  {isPremium ? 'Você é Premium ✨' : 'Tornar-se Premium'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={!isPremium}
                  onClick={() =>
                    setAssinaturaMsg('O downgrade estará disponível assim que ativarmos os pagamentos.')
                  }
                >
                  Fazer downgrade
                </Button>
              </div>
            </div>

            {assinaturaMsg && (
              <p role="status" className="mt-4 text-sm text-text-muted">
                {assinaturaMsg}
              </p>
            )}
          </CardHeader>
        </Card>
      </section>

      {/* Seção 3: Gamificação */}
      <section className="space-y-3">
        <SectionHeader
          title="Sua"
          accent="Jornada"
          description="Acompanhe sua progressão e consistência de estudos."
          as="h2"
        />
        {gamificacao ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-gradient-to-br from-brand-primary/10 to-surface border-brand-primary/20">
              <CardHeader>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Nível Atual</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-extrabold text-text">{gamificacao.nivel.atual}</p>
                  <p className="text-sm font-semibold text-text-muted">
                    {gamificacao.xpTotal.toLocaleString('pt-BR')} XP Total
                  </p>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs font-bold text-text-muted">
                    <span>Progresso p/ Nível {gamificacao.nivel.atual + 1}</span>
                    <span>{gamificacao.nivel.xpNoNivel} / {gamificacao.nivel.xpParaProximoNivel} XP</span>
                  </div>
                  <ProgressBar fraction={gamificacao.nivel.progresso} />
                </div>
              </CardHeader>
            </Card>

            <Card className="flex flex-col items-center justify-center p-6 border-warning/30 bg-warning/5">
              <span className="text-4xl drop-shadow-md mb-2" aria-hidden="true">🔥</span>
              <span className="text-3xl font-extrabold text-warning">{gamificacao.ofensivaDias}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-text-muted mt-1">Dias Seguidos</span>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <p className="text-sm text-text-muted text-center py-4">Os dados da sua jornada estarão disponíveis em breve.</p>
            </CardHeader>
          </Card>
        )}
      </section>

      {/* Seção 4: Perfil Cognitivo 4D */}
      <section className="space-y-3">
        <SectionHeader
          title="Métricas"
          accent="Cognitivas"
          description="Seu mapeamento comportamental com base no que a IA já detectou."
          as="h2"
        />
        <Card>
          <CardHeader>
            {perfilCognitivo && perfilCognitivo.eixos.length > 0 ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text">Confiança do Perfil</span>
                  <Badge variant={perfilCognitivo.confianca > 0.5 ? 'brand' : 'neutral'}>
                    {Math.round(perfilCognitivo.confianca * 100)}%
                  </Badge>
                </div>
                <ul className="space-y-4">
                  {perfilCognitivo.eixos.map((e) => (
                    <AxisRow key={e.chave} eixo={e} />
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-4">Inicie as sessões de estudo para que a IA comece a mapear seu perfil cognitivo.</p>
            )}
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}

// ─────────────────────────── Componentes Auxiliares ───────────────────────────

function ProgressBar({ fraction }: { fraction: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-gradient-brand transition-all duration-1000 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function AxisRow({ eixo }: { eixo: Eixo4D }) {
  const pct = ((eixo.valor + 1) / 2) * 100;
  const lado = eixo.valor === 0 ? null : eixo.valor < 0 ? eixo.poloA : eixo.poloB;
  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between text-sm font-medium text-text">
        <span>{eixo.poloA}</span>
        <span>{eixo.poloB}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
        {eixo.temSinal ? (
          <span
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-brand ring-2 ring-bg"
            style={{ left: `${pct}%` }}
            aria-hidden="true"
          />
        ) : (
          <div
            className="h-full w-full opacity-50"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, var(--color-border) 0 6px, transparent 6px 12px)',
            }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="text-xs">
        {eixo.temSinal && lado ? (
          <span className="text-text-muted">
            Tendência: <strong className="text-text">{lado}</strong>
          </span>
        ) : (
          <Badge variant="neutral">Sem sinal suficiente</Badge>
        )}
      </div>
    </li>
  );
}

function PerfilSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <Skeleton className="h-16 w-1/2" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
