'use client';
// Corretor de Redação (E7, doc 05 §6). Fluxo: POST /redacao (cria + corrige via
// IA, síncrono nesta fase) → GET /redacao/:id (avaliação completa). Enquanto
// corrige, bloqueia novos envios ("IA Corrigindo..."). Em erro, mostra toast
// amigável e PRESERVA o texto (o estado `texto` nunca é limpo no catch).
import { useEffect, useState } from 'react';
import type { CreateRedacaoResponse, EssayEvaluation, RedacaoHistoryItem, MeResponse } from '@notaa/contracts';
import { Lightbulb } from 'lucide-react';
import { Button, Chip, Inset, PageHeader, Progress, Section, TextArea, TextField, cn } from '@notaa/ui';
import { apiFetch } from '../../../lib/api-client';
import { Pagina } from '../../components/Pagina';
import { toast } from '../../components/toast';
import { Voltar } from '../../components/Voltar';

const ERRO_IA = 'Nossos servidores de IA estão lotados. Seu texto foi preservado. Tente de novo em instantes.';

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

  const isPremium = me?.plano && (me.plano.tipo === 'plus' || me.plano.tipo === 'instituicao');
  const limiteMax = isPremium ? Infinity : 3;

  return (
    <div className="mx-auto flex w-full max-w-5xl gap-space-6 px-4 py-space-6 md:py-space-7">
      {/* Histórico de redações */}
      <aside aria-label="Redações anteriores" className="hidden w-64 shrink-0 flex-col border-r border-line pr-space-5 md:flex">
        <h2 className="m-0 mb-space-4 font-display text-heading-3 text-ink">Histórico</h2>
        <ul className="m-0 flex min-h-0 list-none flex-col gap-space-1 p-0">
          {historico.length === 0 ? (
            <li className="text-body-sm text-ink-muted">Nenhuma redação salva.</li>
          ) : (
            historico.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="flex min-h-[44px] w-full flex-col items-start gap-space-1 rounded-md px-space-3 py-space-2 text-left transition-colors duration-fast ease-out hover:bg-surface-sunken"
                  onClick={async () => {
                    try {
                      const resultado = await apiFetch<EssayEvaluation>(`/redacao/${h.id}`);
                      setAvaliacao(resultado);
                    } catch {
                      toast('Não foi possível carregar a redação.', { variant: 'error' });
                    }
                  }}
                >
                  <span className="line-clamp-2 text-label text-ink">{h.temaLivre ?? 'Tema da biblioteca'}</span>
                  <span className="flex w-full items-center justify-between gap-space-2">
                    <span className="text-caption text-ink-muted">{new Date(h.enviadoEm).toLocaleDateString('pt-BR')}</span>
                    <Chip tone={h.status === 'corrigida' ? 'success' : 'neutral'}>{h.status === 'corrigida' ? 'Corrigida' : 'Falha'}</Chip>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="mt-space-4 border-t border-line pt-space-4">
          {isPremium ? (
            <p className="m-0 text-label text-primary">Armazenamento ilimitado</p>
          ) : (
            <div className="flex flex-col gap-space-2">
              <Progress
                value={Math.min(historico.length, 3)}
                max={3}
                label="Redações salvas"
                aria-label="Redações salvas no plano gratuito"
              />
              <p className="m-0 text-caption text-ink-muted">
                {historico.length}/{limiteMax} no plano gratuito
              </p>
              {historico.length >= 3 && (
                <p className="m-0 text-caption text-warning">
                  Limite atingido. A redação mais antiga será excluída ao enviar uma nova.
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-space-6">
        <div className="flex flex-col gap-space-3">
          <Voltar rotulo="Início" />
          <PageHeader
            title="Corretor de redação"
            description="Nota por competência (0 a 200), com feedback que cita o seu próprio texto."
          />
        </div>

        <TextField
          label="Tema (opcional)"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          disabled={corrigindo}
          placeholder="Ex.: Desafios da inclusão digital no Brasil"
        />

        <TextArea
          label="Sua redação"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={corrigindo}
          rows={14}
          placeholder="Escreva aqui a sua dissertação argumentativa…"
          hint={`${texto.trim().length < 20 ? 'Mínimo de 20 caracteres.' : 'Pronto para corrigir.'} ${texto.length} caracteres.`}
          className="[&_textarea]:resize-y [&_textarea]:leading-relaxed"
        />

        <div>
          <Button variant="primary" onClick={enviar} disabled={!podeEnviar} loading={corrigindo}>
            {corrigindo ? 'IA corrigindo' : 'Enviar para correção'}
          </Button>
        </div>

        {corrigindo && (
          <p role="status" className="m-0 text-body-sm text-ink-muted">
            A IA está lendo o seu texto e avaliando as 5 competências do ENEM. Isso leva alguns segundos.
          </p>
        )}
      </div>
    </div>
  );
}

function Resultado({ avaliacao, onNova }: { avaliacao: EssayEvaluation; onNova: () => void }) {
  return (
    <Pagina>
      <div className="flex flex-col gap-space-3">
        <Voltar rotulo="Início" />
        <PageHeader
          title="Correção concluída"
          actions={
            <Button variant="secondary" onClick={onNova}>
              Nova redação
            </Button>
          }
        />
      </div>

      <div className="flex flex-col items-start gap-space-5 sm:flex-row sm:items-center">
        <ScoreRing value={avaliacao.notaTotal} max={1000} />
        <div className="flex flex-col gap-space-2">
          <p className="m-0 text-label text-ink-muted">Nota total estimada</p>
          <p className="m-0 font-display text-heading-1 tabular-nums text-ink">{avaliacao.notaTotal}/1000</p>
          <div>
            <Chip tone="warning">Rubrica {avaliacao.rubricaVersao} · não oficial</Chip>
          </div>
        </div>
      </div>

      <Section title="Notas por competência" divided>
        <ol className="m-0 flex list-none flex-col gap-space-6 p-0">
          {avaliacao.competencias.map((c) => (
            <li key={c.competencia} className="flex flex-col gap-space-3">
              <div className="flex items-baseline justify-between gap-space-3">
                <h3 className="m-0 font-display text-heading-3 text-ink">
                  C{c.competencia}. {c.titulo}
                </h3>
                <span className="shrink-0 font-display text-heading-3 tabular-nums text-primary">{c.nota}/200</span>
              </div>
              <Progress value={c.nota} max={200} aria-label={`Competência ${c.competencia}: ${c.nota} de 200`} />
              <p className="m-0 max-w-texto text-body text-ink-muted">{c.justificativa}</p>
              {c.citacoes.length > 0 && (
                <Inset>
                  <ul className="m-0 flex list-none flex-col gap-space-2 p-0 text-body-sm text-ink-muted">
                    {c.citacoes.map((cit, i) => (
                      <li key={i}>
                        <span className="italic text-ink">“{cit.trecho}”</span> — {cit.comentario}
                      </li>
                    ))}
                  </ul>
                </Inset>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Feedback geral" divided>
        <FeedbackList titulo="Pontos fortes" itens={avaliacao.feedbackGeral.pontosFortes} tone="success" />
        <FeedbackList titulo="A melhorar" itens={avaliacao.feedbackGeral.pontosMelhoria} tone="warning" />
        <div className="flex flex-col gap-space-1">
          <p className="m-0 text-label text-ink">Próximo passo</p>
          <p className="m-0 max-w-texto text-body text-ink-muted">{avaliacao.feedbackGeral.proximoPasso}</p>
        </div>
        {avaliacao.feedbackGeral.dicaPerfil && (
          <Inset tom="violet" className="flex items-start gap-space-3">
            <Lightbulb aria-hidden="true" className="mt-1 h-5 w-5 flex-none text-primary" />
            <div className="flex flex-col gap-space-1">
              <p className="m-0 text-label text-primary">Dica para você</p>
              <p className="m-0 text-body-sm text-ink">{avaliacao.feedbackGeral.dicaPerfil}</p>
            </div>
          </Inset>
        )}
      </Section>
    </Pagina>
  );
}

function ScoreRing({ value, max }: { value: number; max: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg viewBox="0 0 80 80" aria-hidden="true" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" className="stroke-surface-sunken" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          className="text-primary [stroke:currentColor] transition-[stroke-dashoffset] duration-slow ease-out"
        />
      </svg>
      <span className="absolute font-display text-heading-3 tabular-nums text-ink">{value}</span>
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
    <div className="flex flex-col gap-space-2">
      <p className={cn('m-0 text-label', tone === 'success' ? 'text-success' : 'text-warning')}>{titulo}</p>
      <ul className="m-0 flex list-none flex-col gap-space-2 p-0 text-body text-ink-muted">
        {itens.map((it, i) => (
          <li key={i} className="flex gap-space-2">
            <span aria-hidden="true">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
