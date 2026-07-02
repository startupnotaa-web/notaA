'use client';
// Corretor de Redação (E7, doc 05 §6). Fluxo: POST /redacao (cria + corrige via
// IA, síncrono nesta fase) → GET /redacao/:id (avaliação completa). Enquanto
// corrige, bloqueia novos envios ("IA Corrigindo..."). Em erro, mostra toast
// amigável e PRESERVA o texto (o estado `texto` nunca é limpo no catch).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CreateRedacaoResponse, EssayEvaluation, RedacaoHistoryItem, MeResponse } from '@notaa/contracts';
import { Badge, Button, Card, CardHeader, cn } from '@notaa/ui';
import { apiFetch } from '../../../lib/api-client';
import { toast } from '../../components/toast';

const ERRO_IA = 'Nossos servidores de IA estão lotados. Seu texto foi preservado — tente novamente em instantes.';

export default function RedacaoPage() {
  const [texto, setTexto] = useState('');
  const [tema, setTema] = useState('');
  const [corrigindo, setCorrigindo] = useState(false);
  const [avaliacao, setAvaliacao] = useState<EssayEvaluation | null>(null);
  
  const [historico, setHistorico] = useState<RedacaoHistoryItem[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      apiFetch<{ historico: RedacaoHistoryItem[] }>('/redacao/history').catch(() => null),
      apiFetch<MeResponse>('/me').catch(() => null),
    ]).then(([hResp, meResp]) => {
      if (vivo) {
        if (hResp) setHistorico(hResp.historico);
        if (meResp) setMe(meResp);
      }
    });
    return () => { vivo = false; };
  }, []);

  const podeEnviar = texto.trim().length >= 20 && !corrigindo;

  async function enviar() {
    if (!podeEnviar) return;
    setCorrigindo(true);
    setAvaliacao(null);
    try {
      const criada = await apiFetch<CreateRedacaoResponse>('/redacao', {
        method: 'POST',
        body: JSON.stringify({ texto, ...(tema.trim() ? { temaLivre: tema.trim() } : {}) }),
      });
      if (criada.status === 'falha' || criada.status === 'bloqueada_protocolo') {
        toast(ERRO_IA, { variant: 'error' });
        return;
      }
      const resultado = await apiFetch<EssayEvaluation>(`/redacao/${criada.id}`);
      setAvaliacao(resultado);
      
      // Atualiza o histórico para incluir a nova redação após sucesso
      const hResp = await apiFetch<{ historico: RedacaoHistoryItem[] }>('/redacao/history').catch(() => null);
      if (hResp) setHistorico(hResp.historico);
    } catch {
      toast(ERRO_IA, { variant: 'error' });
    } finally {
      setCorrigindo(false);
    }
  }

  function novaRedacao() {
    setAvaliacao(null);
    setTexto('');
    setTema('');
  }

  if (avaliacao) {
    return <Resultado avaliacao={avaliacao} onNova={novaRedacao} />;
  }

  const isPremium = me?.plano && (me.plano.tipo === 'plus' || me.plano.tipo === 'escola');
  const limiteMax = isPremium ? Infinity : 3;

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl gap-4 p-4">
      {/* Sidebar de Histórico */}
      <aside className="hidden w-64 flex-col rounded-2xl border border-border bg-surface p-4 md:flex max-h-[calc(100vh-9rem)]">
        <h2 className="mb-4 font-bold">Histórico (Redação)</h2>
        <div className="flex-1 overflow-y-auto space-y-2">
          {historico.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhuma redação salva.</p>
          ) : (
            historico.map((h) => (
              <div key={h.id} className="rounded-xl border border-border p-3 text-sm cursor-pointer hover:border-brand-primary/50 transition-colors"
                   onClick={async () => {
                     try {
                       const resultado = await apiFetch<EssayEvaluation>(`/redacao/${h.id}`);
                       setAvaliacao(resultado);
                     } catch {
                       toast('Falha ao carregar redação.', { variant: 'error' });
                     }
                   }}>
                <p className="font-semibold line-clamp-2">{h.temaLivre ?? 'Tema da Biblioteca'}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-text-muted">{new Date(h.enviadoEm).toLocaleDateString()}</p>
                  <Badge variant={h.status === 'corrigida' ? 'success' : 'neutral'} className="text-[9px] px-1.5 py-0">
                    {h.status === 'corrigida' ? 'Corrigida' : 'Falha'}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 shrink-0 border-t border-border pt-4">
          <p className="text-sm font-semibold">
            {isPremium ? (
              <span className="text-brand-accent">Armazenamento Ilimitado</span>
            ) : (
              <span>Armazenamento (Free)</span>
            )}
          </p>
          {!isPremium && (
            <div className="mt-2 text-xs text-text-muted">
              <div className="flex justify-between font-bold mb-1">
                <span>Usado</span>
                <span className={historico.length >= limiteMax ? 'text-warning' : ''}>
                  {historico.length}/{limiteMax} Disponíveis
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-warning transition-all"
                  style={{ width: `${Math.min((historico.length / 3) * 100, 100)}%` }}
                />
              </div>
              {historico.length >= 3 && (
                <p className="mt-2 text-[10px] leading-tight text-warning/80">
                  Limite atingido. A redação mais antiga será excluída ao enviar uma nova.
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col space-y-5">
        <header className="space-y-1">
          <Link href="/dashboard" className="text-sm text-text-muted hover:text-text">
            ← Início
          </Link>
          <h1 className="text-2xl font-bold">Corretor de Redação</h1>
          <p className="text-sm text-text-muted">
            Nota por competência (0–200) com feedback citando o seu próprio texto.
          </p>
        </header>

        <div className="space-y-1">
          <label htmlFor="tema" className="text-sm font-medium text-text">
            Tema (opcional)
          </label>
          <input
            id="tema"
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            disabled={corrigindo}
            placeholder="Ex.: Desafios da inclusão digital no Brasil"
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text placeholder:text-text-muted/60 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-60"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="texto" className="text-sm font-medium text-text">
            Sua redação
          </label>
          <textarea
            id="texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={corrigindo}
            rows={14}
            placeholder="Escreva aqui sua dissertação argumentativa..."
            className="w-full resize-y rounded-lg border border-border bg-surface px-4 py-3 leading-relaxed text-text placeholder:text-text-muted/60 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-60"
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>{texto.trim().length < 20 ? 'Mínimo de 20 caracteres.' : 'Pronto para corrigir.'}</span>
            <span>{texto.length} caracteres</span>
          </div>
        </div>

        <Button variant="cta" fullWidth onClick={enviar} disabled={!podeEnviar}>
          {corrigindo ? (
            <span className="inline-flex items-center gap-2">
              <Spinner /> IA Corrigindo...
            </span>
          ) : (
            'Enviar para correção'
          )}
        </Button>

        {corrigindo && (
          <p className="text-center text-sm text-text-muted">
            A IA está lendo seu texto e avaliando as 5 competências do ENEM. Isso leva alguns segundos.
          </p>
        )}
      </div>
    </div>
  );
}

function Resultado({ avaliacao, onNova }: { avaliacao: EssayEvaluation; onNova: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-text-muted hover:text-text">
            ← Início
          </Link>
          <h1 className="text-2xl font-bold">Correção concluída</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={onNova}>
          Nova redação
        </Button>
      </header>

      {/* Nota total */}
      <Card variant="highlight">
        <CardHeader className="items-center gap-3 text-center sm:flex-row sm:text-left">
          <ScoreRing value={avaliacao.notaTotal} max={1000} />
          <div className="flex-1">
            <p className="text-sm text-text-muted">Nota total estimada</p>
            <p className="text-3xl font-extrabold text-text">{avaliacao.notaTotal}/1000</p>
            <Badge variant="warning" className="mt-1">
              rubrica {avaliacao.rubricaVersao} · não oficial
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* 5 competências */}
      <section className="space-y-3">
        <h2 className="text-base font-bold">Notas por competência</h2>
        {avaliacao.competencias.map((c) => (
          <Card key={c.competencia}>
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-text">
                  C{c.competencia}. {c.titulo}
                </h3>
                <span className="shrink-0 text-sm font-extrabold text-brand-primary">{c.nota}/200</span>
              </div>
              <CompetencyBar nota={c.nota} />
              <p className="text-sm text-text-muted">{c.justificativa}</p>
              {c.citacoes.length > 0 && (
                <ul className="space-y-1 border-l-2 border-brand-primary/40 pl-3 text-xs text-text-muted">
                  {c.citacoes.map((cit, i) => (
                    <li key={i}>
                      <span className="italic text-text">“{cit.trecho}”</span> — {cit.comentario}
                    </li>
                  ))}
                </ul>
              )}
            </CardHeader>
          </Card>
        ))}
      </section>

      {/* Feedback geral */}
      <section className="space-y-3">
        <h2 className="text-base font-bold">Feedback geral</h2>
        <Card>
          <CardHeader className="gap-4">
            <FeedbackList titulo="Pontos fortes" itens={avaliacao.feedbackGeral.pontosFortes} tone="success" />
            <FeedbackList titulo="A melhorar" itens={avaliacao.feedbackGeral.pontosMelhoria} tone="warning" />
            <div>
              <p className="mb-1 text-sm font-bold text-text">Próximo passo</p>
              <p className="text-sm text-text-muted">{avaliacao.feedbackGeral.proximoPasso}</p>
            </div>
            {avaliacao.feedbackGeral.dicaPerfil && (
              <div className="mt-4 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">✨</span>
                  <p className="text-sm font-bold text-brand-primary">Dica Especial para Você</p>
                </div>
                <p className="text-sm text-text-muted leading-relaxed">{avaliacao.feedbackGeral.dicaPerfil}</p>
              </div>
            )}
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}

function CompetencyBar({ nota }: { nota: number }) {
  const pct = Math.round((Math.max(0, Math.min(200, nota)) / 200) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-gradient-brand transition-all duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ScoreRing({ value, max }: { value: number; max: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative mx-auto flex h-24 w-24 shrink-0 items-center justify-center">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-surface-2" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          className="text-brand-primary [stroke:currentColor] transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-lg font-extrabold text-text">{value}</span>
    </div>
  );
}

function FeedbackList({
  titulo,
  itens,
  tone,
}: {
  titulo: string;
  itens: string[];
  tone: 'success' | 'warning';
}) {
  if (itens.length === 0) return null;
  return (
    <div>
      <p className={cn('mb-1 text-sm font-bold', tone === 'success' ? 'text-success' : 'text-warning')}>
        {titulo}
      </p>
      <ul className="space-y-1 text-sm text-text-muted">
        {itens.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
      aria-hidden="true"
    />
  );
}
