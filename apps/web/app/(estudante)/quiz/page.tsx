'use client';
// Quiz adaptativo real (E2) — fala com a API (Motor TRI, doc 05 §4). Itens hoje
// vêm do banco_de_itens marcado `naoCalibrado` (Q-02) — por isso a estimativa
// de nota nunca aparece aqui como número oficial.
import { useState } from 'react';
import Link from 'next/link';
import type { AreaConhecimento, ItemPublico, SubmitAnswerResponse } from '@notaa/contracts';
import { Badge, Button, Card, OptionCard, Progress, cn } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { toast } from '../../components/toast';

const AREAS: { valor: AreaConhecimento; label: string; icon?: string; colorClass?: string }[] = [
  { valor: 'matematica', label: 'Matemática', icon: '📐', colorClass: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' },
  { valor: 'linguagens', label: 'Linguagens', icon: '📚', colorClass: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' },
  { valor: 'humanas', label: 'Humanas', icon: '🌍', colorClass: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20' },
  { valor: 'natureza', label: 'Natureza', icon: '🔬', colorClass: 'bg-green-500/10 text-green-500 hover:bg-green-500/20' },
  { valor: 'fin', label: 'Educação Financeira', icon: '💰', colorClass: 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/30' },
  { valor: 'soc', label: 'Socioemocional', icon: '🧠', colorClass: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/30' },
  { valor: 'art', label: 'Artes', icon: '🎨', colorClass: 'bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 border-pink-500/30' },
];

type Resultado = SubmitAnswerResponse | null;

export default function QuizPage() {
  const [area, setArea] = useState<AreaConhecimento | null>(null);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [questao, setQuestao] = useState<ItemPublico | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado>(null);
  const [iniciadaEm, setIniciadaEm] = useState<number>(0);
  const [acertos, setAcertos] = useState(0);
  const [respondidas, setRespondidas] = useState(0);
  const [done, setDone] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [confete, setConfete] = useState(false);

  async function iniciar(areaEscolhida: AreaConhecimento) {
    setErro(null);
    setCarregando(true);
    try {
      const res = await apiFetch<{ sessaoId: string; primeiraQuestao: ItemPublico }>('/quiz/sessions', {
        method: 'POST',
        body: JSON.stringify({ area: areaEscolhida }),
      });
      setArea(areaEscolhida);
      setSessaoId(res.sessaoId);
      setQuestao(res.primeiraQuestao);
      setIniciadaEm(Date.now());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // Redirecionamento já está em andamento pelo interceptor
      } else {
        toast('A IA encontrou uma instabilidade ao gerar sua questão inédita. Tente novamente.', { variant: 'error' });
        setErro(null);
      }
    } finally {
      setCarregando(false);
    }
  }

  async function responder() {
    if (!sessaoId || !questao || picked == null) return;
    setErro(null);
    setCarregando(true);
    try {
      const tempoRespostaMs = Date.now() - iniciadaEm;
      const res = await apiFetch<SubmitAnswerResponse>(`/quiz/sessions/${sessaoId}/answers`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ itemId: questao.itemId, respostaId: picked, tempoRespostaMs }),
      });
      setResultado(res);
      setRespondidas((n) => n + 1);
      if (res.acerto) setAcertos((n) => n + 1);
      // Recompensa: animação + toast comemorativo quando o aluno sobe de nível (E9).
      if (res.gamificacao.subiuDeNivel) {
        setConfete(true);
        toast(`🎉 Você subiu para o nível ${res.gamificacao.nivel}!`, { variant: 'success' });
        setTimeout(() => setConfete(false), 2200);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // Redirecionamento já está em andamento pelo interceptor
      } else {
        setErro(e instanceof ApiError ? e.message : 'Não foi possível enviar a resposta.');
      }
    } finally {
      setCarregando(false);
    }
  }

  async function proxima() {
    if (!resultado) return;
    if (!resultado.proximaQuestao) {
      if (sessaoId) await apiFetch(`/quiz/sessions/${sessaoId}/finish`, { method: 'POST' }).catch(() => {});
      setDone(true);
      return;
    }
    setQuestao(resultado.proximaQuestao);
    setResultado(null);
    setPicked(null);
    setIniciadaEm(Date.now());
  }

  if (!area) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <h1 className="text-xl font-bold">Escolha uma área para começar</h1>
        {erro && <p role="alert" className="text-sm text-error">{erro}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {AREAS.map((a) => (
            <Button 
              key={a.valor} 
              variant="secondary" 
              size="lg" 
              className={cn("flex flex-col items-center gap-2 h-auto py-6 border transition-all", a.colorClass)}
              disabled={carregando} 
              onClick={() => iniciar(a.valor)}
            >
              <span className="text-3xl" aria-hidden="true">{a.icon}</span>
              <span className="font-semibold">{a.label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <Card variant="highlight" className="space-y-3 p-6 text-center">
          <h1 className="text-2xl font-bold">Quiz concluído</h1>
          <p className="text-text-muted">
            Você acertou <strong className="text-text">{acertos}</strong> de {respondidas}. Usamos isso para
            ajustar a dificuldade — não é uma nota oficial (banco de itens ainda não calibrado).
          </p>
          <div className="pt-2">
            <Button asChild variant="cta" size="lg">
              <Link href="/dashboard">Ver no painel</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!questao) return null;

  const acertou = resultado?.acerto ?? false;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4">
      {confete && <Confetti />}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="info">{questao.area}</Badge>
          <span className="text-sm text-text-muted">Questão {questao.numero}</span>
        </div>
        <Progress value={respondidas} max={respondidas + 1} gradient aria-label="Progresso do quiz" />
        <p className="text-xs text-text-muted">Itens de desenvolvimento — banco ainda não calibrado (Q-02).</p>
      </div>

      <h1 className="max-w-[70ch] text-lg font-semibold leading-relaxed">{questao.enunciado}</h1>

      <div role="radiogroup" aria-label="Alternativas" className="space-y-2">
        {questao.alternativas.map((a) => {
          const state = !resultado ? 'neutral' : a.id === picked ? (acertou ? 'correct' : 'incorrect') : 'neutral';
          return (
            <OptionCard
              key={a.id}
              leading={a.id}
              title={a.texto}
              selected={picked === a.id}
              state={state}
              disabled={!!resultado}
              onClick={() => setPicked(a.id)}
            />
          );
        })}
      </div>

      {erro && <p role="alert" className="text-sm text-error">{erro}</p>}

      {resultado && (
        <Card
          className={cn(
            'space-y-2 p-4 transition-shadow',
            resultado.gamificacao.subiuDeNivel &&
              'border-brand-primary/60 shadow-[0_0_24px_rgba(38,153,233,0.45)]',
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={acertou ? 'success' : 'warning'} icon={<span aria-hidden="true">{acertou ? '✓' : '↻'}</span>}>
              {acertou ? 'Você acertou' : 'Quase lá'}
            </Badge>
            {resultado.gamificacao.subiuDeNivel && (
              <Badge variant="brand" icon={<span aria-hidden="true">⭐</span>}>
                Subiu para o nível {resultado.gamificacao.nivel}!
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-muted">
            +{resultado.xpGanho} XP · {resultado.gamificacao.xpTotal} XP total · Nível{' '}
            {resultado.gamificacao.nivel} · θ atual: {resultado.theta.toFixed(2)}
          </p>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        {!resultado ? (
          <Button variant="primary" onClick={responder} disabled={picked == null || carregando}>
            {carregando ? 'Enviando...' : 'Responder'}
          </Button>
        ) : (
          <Button variant="cta" onClick={proxima} disabled={carregando}>
            {resultado.proximaQuestao ? 'Próxima questão' : 'Finalizar'}
          </Button>
        )}
      </div>
    </div>
  );
}

// Explosão de confete CSS-only (sem dependência) — disparada no level-up (E9).
const CONFETE_CORES = ['#2699E9', '#7B4FE0', '#D500F9', '#22c55e', '#f59e0b'];
function Confetti() {
  const pedacos = Array.from({ length: 70 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    dur: 1.2 + Math.random() * 0.9,
    cor: CONFETE_CORES[i % CONFETE_CORES.length]!,
    w: 6 + Math.random() * 6,
    rot: Math.random() * 360,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <style>{`@keyframes notaaConfetti{0%{transform:translateY(-12vh) rotate(0);opacity:1}100%{transform:translateY(112vh) rotate(720deg);opacity:.85}}`}</style>
      {pedacos.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: `${p.w}px`,
            height: `${p.w * 0.4}px`,
            background: p.cor,
            borderRadius: 1,
            transform: `rotate(${p.rot}deg)`,
            animation: `notaaConfetti ${p.dur}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
