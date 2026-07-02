'use client';
// Tutor Socrático (E8, doc 05 §7). Abre uma conversa (POST /socratic/sessions) e
// troca mensagens (POST /socratic/sessions/:id/messages). UX: a mensagem do aluno
// aparece na hora (otimista), um indicador de digitação roda enquanto a IA pensa,
// e a resposta é renderizada com Markdown leve. Em erro: toast amigável + a
// mensagem volta para o input (o aluno não perde o que digitou) e o balão otimista
// é removido. O Perfil 4D é injetado no backend — o cliente nunca manda contexto.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { SocraticResponse, SocraticHistoryItem, MeResponse } from '@notaa/contracts';
import { Button, cn } from '@notaa/ui';
import { apiFetch } from '../../../lib/api-client';
import { toast } from '../../components/toast';

const ERRO_IA = 'Nossos servidores de IA estão lotados. Tente novamente em instantes.';

type ChatMsg = {
  id: string;
  papel: 'estudante' | 'tutor';
  conteudo: string;
  resposta?: SocraticResponse;
};

let tmpSeq = 0;
const tmpId = () => `tmp-${++tmpSeq}`;

export default function SocraticoPage() {
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(true);
  const [mensagens, setMensagens] = useState<ChatMsg[]>([]);
  const [rascunho, setRascunho] = useState('');
  const [pensando, setPensando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const [historico, setHistorico] = useState<SocraticHistoryItem[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);

  // Abre a sessão ao montar e carrega histórico + me
  useEffect(() => {
    let vivo = true;

    Promise.all([
      apiFetch<{ historico: SocraticHistoryItem[] }>('/socratic/history').catch(() => null),
      apiFetch<MeResponse>('/me').catch(() => null),
    ]).then(([hResp, meResp]) => {
      if (vivo) {
        if (hResp) setHistorico(hResp.historico);
        if (meResp) setMe(meResp);
      }
    });

    apiFetch<{ conversaId: string }>('/socratic/sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    })
      .then((s) => {
        if (vivo) setConversaId(s.conversaId);
      })
      .catch(() => {
        if (vivo) toast('Não foi possível abrir a sessão do tutor. Recarregue a página.', { variant: 'error' });
      })
      .finally(() => {
        if (vivo) setAbrindo(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Auto-scroll para a última mensagem.
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, pensando]);

  async function enviar() {
    const texto = rascunho.trim();
    if (!texto || !conversaId || pensando) return;

    const otimista: ChatMsg = { id: tmpId(), papel: 'estudante', conteudo: texto };
    setMensagens((m) => [...m, otimista]);
    setRascunho('');
    setPensando(true);

    try {
      const resposta = await apiFetch<SocraticResponse>(
        `/socratic/sessions/${conversaId}/messages`,
        { method: 'POST', body: JSON.stringify({ mensagem: texto }) },
      );
      setMensagens((m) => [
        ...m,
        { id: tmpId(), papel: 'tutor', conteudo: resposta.mensagem, resposta },
      ]);
    } catch {
      setMensagens((m) => m.filter((x) => x.id !== otimista.id));
      setRascunho(texto);
      toast(ERRO_IA, { variant: 'error' });
    } finally {
      setPensando(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  const isPremium = me?.plano && (me.plano.tipo === 'plus' || me.plano.tipo === 'escola');
  const limiteMax = isPremium ? Infinity : 3;

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] w-full max-w-5xl gap-4 p-4">
      {/* Sidebar de Histórico */}
      <aside className="hidden w-64 flex-col rounded-2xl border border-border bg-surface p-4 md:flex">
        <h2 className="mb-4 font-bold">Histórico (Socrático)</h2>
        <div className="flex-1 overflow-y-auto space-y-2">
          {historico.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhuma conversa salva.</p>
          ) : (
            historico.map((h) => (
              <div key={h.id} className="rounded-xl border border-border p-3 text-sm">
                <p className="font-semibold">{h.temaAtivo ?? 'Sessão Livre'}</p>
                <p className="text-xs text-text-muted">{new Date(h.criadoEm).toLocaleDateString()}</p>
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
                  Limite atingido. O chat mais antigo será excluído automaticamente ao criar um novo.
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        <header className="mb-3 shrink-0 space-y-0.5">
          <Link href="/dashboard" className="text-sm text-text-muted hover:text-text">
            ← Início
          </Link>
          <h1 className="text-xl font-bold">Tutor Socrático</h1>
        </header>

        {/* Histórico Ativo */}
        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-surface/40 p-4">
          {abrindo ? (
            <p className="text-sm text-text-muted">Abrindo sua sessão...</p>
          ) : mensagens.length === 0 ? (
            <EmptyState />
          ) : (
            mensagens.map((m) => <Bubble key={m.id} msg={m} />)
          )}
          {pensando && <TypingIndicator />}
          <div ref={fimRef} />
        </div>

        {/* Composer */}
        <div className="mt-3 flex shrink-0 items-end gap-2">
          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={abrindo || !conversaId}
            rows={1}
            placeholder="Pergunte algo... (o tutor vai te guiar, não dar a resposta pronta)"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 text-text placeholder:text-text-muted/60 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-60"
          />
          <Button variant="cta" onClick={enviar} disabled={!rascunho.trim() || pensando || !conversaId}>
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMsg }) {
  const isAluno = msg.papel === 'estudante';
  return (
    <div className={cn('flex', isAluno ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isAluno
            ? 'bg-gradient-brand text-white'
            : 'border border-border bg-surface-2 text-text',
        )}
      >
        {isAluno ? <span>{msg.conteudo}</span> : <Markdown text={msg.conteudo} />}
        {msg.resposta?.tipo === 'degraded_static' && msg.resposta.dicasEstaticas.length > 0 && (
          <ul className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-text-muted">
            {msg.resposta.dicasEstaticas.map((d, i) => (
              <li key={i}>• {d}</li>
            ))}
          </ul>
        )}
        {msg.resposta?.tipo === 'care_protocol' && (
          <div className="mt-2 space-y-1 border-t border-error/40 pt-2 text-xs">
            <p className="font-semibold text-error">Você não está sozinho. Recursos de apoio:</p>
            {msg.resposta.recursos.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer" className="block text-info underline">
                {r.nome} — {r.contato}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-label="O tutor está digitando">
      <div className="flex items-center gap-1 rounded-2xl border border-border bg-surface-2 px-4 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-text-muted"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-text-muted">
      <span className="text-4xl" aria-hidden="true">
        💬
      </span>
      <p className="max-w-xs text-sm">
        Faça uma pergunta sobre qualquer matéria. O tutor vai te guiar até a resposta com perguntas —
        nunca entregando-a de bandeja.
      </p>
    </div>
  );
}

// Markdown leve (sem dependência): **negrito**, listas "- "/"* " e quebras de linha.
function Markdown({ text }: { text: string }): ReactNode {
  const linhas = text.split('\n');
  return (
    <div className="space-y-1">
      {linhas.map((linha, i) => {
        const li = linha.match(/^\s*[-*]\s+(.*)$/);
        if (li) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span aria-hidden="true">•</span>
              <span>{inline(li[1] ?? '')}</span>
            </div>
          );
        }
        if (linha.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i}>{inline(linha)}</p>;
      })}
    </div>
  );
}

function inline(s: string): ReactNode {
  // Divide em **negrito** preservando o resto como texto.
  const partes = s.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) => {
    const m = p.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={i}>{m[1]}</strong>;
    return <span key={i}>{p}</span>;
  });
}
