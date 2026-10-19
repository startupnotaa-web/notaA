'use client';
// Quiz adaptativo real (E2) — fala com a API (Motor TRI, doc 05 §4). Itens hoje
// vêm do banco_de_itens marcado `naoCalibrado` (Q-02) — por isso a estimativa
// de nota nunca aparece aqui como número oficial.
import { useState } from 'react';
import Link from 'next/link';
import type { AreaConhecimento, ItemPublico, SubmitAnswerResponse } from '@notaa/contracts';
import { QUIZ_TOTAL_QUESTOES } from '@notaa/contracts';
import { Brain, Calculator, FlaskConical, Globe, Palette, PiggyBank, BookOpen, type LucideIcon } from 'lucide-react';
import { Button, ButtonLink, Chip, Notice, OptionCard, PageHeader, Progress } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Atalho, AtalhoLista } from '../../components/Atalho';
import { Pagina } from '../../components/Pagina';
import { toast } from '../../components/toast';

const AREAS: { valor: AreaConhecimento; label: string; descricao: string; Icone: LucideIcon }[] = [
  { valor: 'matematica', label: 'Matemática', descricao: 'Álgebra, geometria, estatística e funções.', Icone: Calculator },
  { valor: 'linguagens', label: 'Linguagens', descricao: 'Interpretação de texto, gramática e literatura.', Icone: BookOpen },
  { valor: 'humanas', label: 'Humanas', descricao: 'História, geografia, filosofia e sociologia.', Icone: Globe },
  { valor: 'natureza', label: 'Natureza', descricao: 'Física, química e biologia.', Icone: FlaskConical },
  { valor: 'fin', label: 'Educação financeira', descricao: 'Juros, orçamento e decisões de consumo.', Icone: PiggyBank },
  { valor: 'soc', label: 'Socioemocional', descricao: 'Foco, organização e relações.', Icone: Brain },
  { valor: 'art', label: 'Artes', descricao: 'Movimentos, linguagens e cultura.', Icone: Palette },
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
      console.error('[QUIZ_IA_DIAGNOSTICO] etapa=iniciar', e);
      if (e instanceof ApiError && e.status === 401) {
        // Redirecionamento já está em andamento pelo interceptor
      } else {
        toast('Não foi possível gerar a questão agora. Tente de novo.', { variant: 'error' });
        setErro(e instanceof ApiError ? e.message : 'Não foi possível gerar uma questão pela IA.');
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
      // Recompensa: aviso quando o aluno sobe de nível (E9).
      if (res.gamificacao.subiuDeNivel) {
        toast(`Você subiu para o nível ${res.gamificacao.nivel}!`, { variant: 'success' });
      }
    } catch (e) {
      console.error('[QUIZ_IA_DIAGNOSTICO] etapa=responder', e);
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
      <Pagina largura="estreita">
        <PageHeader title="Escolha uma área para começar" description="O quiz se adapta às suas respostas, questão a questão." />
        {erro && <Notice tone="danger">{erro}</Notice>}
        <AtalhoLista>
          {AREAS.map(({ valor, label, descricao, Icone }) => (
            <Atalho
              key={valor}
              icone={<Icone className="h-5 w-5" />}
              titulo={label}
              descricao={descricao}
              disabled={carregando}
              onSelecionar={() => iniciar(valor)}
            />
          ))}
        </AtalhoLista>
        {carregando && (
          <p role="status" className="m-0 text-body-sm text-ink-muted">
            Preparando sua primeira questão…
          </p>
        )}
      </Pagina>
    );
  }

  if (done) {
    return (
      <Pagina largura="estreita">
        <PageHeader
          title="Quiz concluído"
          description={
            <>
              Você acertou <strong className="text-ink">{acertos}</strong> de {respondidas}. Usamos isso para ajustar a sua
              experiência de estudo. As questões desta sessão foram geradas pela IA e ainda não compõem uma nota oficial
              calibrada.
            </>
          }
        />
        <div>
          <ButtonLink as={Link} href="/dashboard" variant="primary">
            Ver no painel
          </ButtonLink>
        </div>
      </Pagina>
    );
  }

  if (!questao) return null;

  const acertou = resultado?.acerto ?? false;
  const rotuloArea = AREAS.find((a) => a.valor === questao.area)?.label ?? questao.area;

  return (
    <Pagina largura="estreita">
      <div className="flex flex-col gap-space-3">
        <div className="flex items-center justify-between">
          <Chip tone="info">{rotuloArea}</Chip>
          <span className="text-body-sm tabular-nums text-ink-muted">
            Questão {questao.numero} de {QUIZ_TOTAL_QUESTOES}
          </span>
        </div>
        <Progress value={respondidas} max={QUIZ_TOTAL_QUESTOES} aria-label="Progresso do quiz" />
        <p className="m-0 text-caption text-ink-muted">Questão inédita gerada por IA para esta sessão.</p>
      </div>

      <h1 className="m-0 max-w-texto text-body font-bold">{questao.enunciado}</h1>

      <div role="radiogroup" aria-label="Alternativas" className="flex flex-col gap-space-3">
        {questao.alternativas.map((a) => {
          // Depois de responder, a correta fica verde SEMPRE — inclusive quando o
          // aluno errou, que é quando ele mais precisa ver qual era. A escolha
          // errada fica vermelha em paralelo.
          const state = !resultado
            ? 'neutral'
            : a.id === resultado.gabarito
              ? 'correct'
              : a.id === picked
                ? 'incorrect'
                : 'neutral';
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

      {erro && <Notice tone="danger">{erro}</Notice>}

      {resultado && (
        <Notice tone={acertou ? 'success' : 'warning'} title={acertou ? 'Você acertou' : 'Quase lá'}>
          +{resultado.xpGanho} XP · {resultado.gamificacao.xpTotal} XP no total · nível {resultado.gamificacao.nivel} · θ
          atual {resultado.theta.toFixed(2)}
          {resultado.gamificacao.subiuDeNivel && (
            <span className="mt-2 block">
              <Chip tone="brand">Subiu para o nível {resultado.gamificacao.nivel}</Chip>
            </span>
          )}
        </Notice>
      )}

      <div className="flex gap-space-3">
        {!resultado ? (
          <Button variant="primary" onClick={responder} disabled={picked == null} loading={carregando}>
            {carregando ? 'Enviando' : 'Responder'}
          </Button>
        ) : (
          <Button variant="primary" onClick={proxima} disabled={carregando}>
            {resultado.proximaQuestao ? 'Próxima questão' : 'Finalizar'}
          </Button>
        )}
      </div>
    </Pagina>
  );
}
