'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { QuestaoSimuladoResponse } from '@notaa/contracts';
import { Badge, Button, Card, OptionCard, Progress, cn } from '@notaa/ui';
import { useUser } from '../../../lib/user-context';
import { apiFetch } from '../../../lib/api-client';
import { toast } from '../../components/toast';

const TOTAL_QUESTOES = 8;
const XP_POR_ACERTO = 50; // XP base por acerto (pode ser multiplicado pelo nível)

type NivelDificuldade = 1 | 2 | 3;
type FaseSimulado = 'config' | 'simulado' | 'resultado';

interface QuestaoSimulado {
  id: string;
  enunciado: string;
  alternativas: { id: string; texto: string; correta: boolean }[];
  nivel: NivelDificuldade;
  area: string;
}

export default function SimuladoPage() {
  const { addXP } = useUser();
  const [fase, setFase] = useState<FaseSimulado>('config');
  const [nivelAtual, setNivelAtual] = useState<NivelDificuldade>(2); // Inicia no médio
  
  const [questoesJogadas, setQuestoesJogadas] = useState<Set<string>>(new Set());
  const [questaoAtual, setQuestaoAtual] = useState<QuestaoSimulado | null>(null);
  
  const [respondidas, setRespondidas] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [pontuacaoAcumulada, setPontuacaoAcumulada] = useState(0);
  
  const [picked, setPicked] = useState<string | null>(null);
  const [revelado, setRevelado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const obterProximaQuestao = async (
    nivelDesejado: NivelDificuldade | undefined,
    excluirIds: string[],
  ): Promise<QuestaoSimulado | null> => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (nivelDesejado !== undefined) params.set('nivel', String(nivelDesejado));
      if (excluirIds.length > 0) params.set('excluir', excluirIds.join(','));

      // Sem "nivel" na 1ª chamada: o backend ancora a dificuldade inicial na
      // proficiência real do aluno (habilidade TRI), em vez de sempre começar em "Médio".
      const data = await apiFetch<QuestaoSimuladoResponse>(`/simulado/next-item?${params.toString()}`, {
        method: 'GET',
      });

      return {
        id: data.id,
        enunciado: data.enunciado,
        alternativas: data.alternativas,
        nivel: data.nivel as NivelDificuldade,
        area: data.area,
      };
    } catch (err) {
      toast('Erro ao carregar questão do banco. Tente novamente.', { variant: 'error' });
      return null;
    } finally {
      setCarregando(false);
    }
  };

  const iniciarSimulado = async () => {
    setFase('simulado');
    setRespondidas(0);
    setAcertos(0);
    setPontuacaoAcumulada(0);
    setQuestoesJogadas(new Set());
    setPicked(null);
    setRevelado(false);

    const primeira = await obterProximaQuestao(undefined, []);
    if (primeira) {
      setNivelAtual(primeira.nivel);
      setQuestaoAtual(primeira);
      setQuestoesJogadas(new Set([primeira.id]));
    } else {
      setFase('config');
    }
  };

  const handleResponder = () => {
    if (!picked || !questaoAtual) return;

    setRevelado(true);
    const acertou = questaoAtual.alternativas.find((a) => a.id === picked)?.correta;

    if (acertou) {
      setAcertos(prev => prev + 1);
      const xpGanho = XP_POR_ACERTO * nivelAtual;
      setPontuacaoAcumulada(prev => prev + xpGanho);
    }
  };

  const proximaQuestao = async () => {
    if (!questaoAtual) return;

    const acertou = questaoAtual.alternativas.find((a) => a.id === picked)?.correta;

    // Algoritmo de Adaptação de Dificuldade
    let proximoNivel = nivelAtual;
    if (acertou) {
      proximoNivel = Math.min(nivelAtual + 1, 3) as NivelDificuldade;
    } else {
      proximoNivel = Math.max(nivelAtual - 1, 1) as NivelDificuldade;
    }
    setNivelAtual(proximoNivel);
    setRespondidas(prev => prev + 1);

    if (respondidas + 1 >= TOTAL_QUESTOES) {
      finalizarSimulado();
    } else {
      const prox = await obterProximaQuestao(proximoNivel, Array.from(questoesJogadas));
      if (prox) {
        setQuestaoAtual(prox);
        setQuestoesJogadas(prev => new Set(prev).add(prox.id));
        setPicked(null);
        setRevelado(false);
      } else {
        finalizarSimulado();
      }
    }
  };

  const finalizarSimulado = async () => {
    setFase('resultado');
    setCarregando(true);
    // Aplica pontuação global no frontend (Optimistic)
    addXP(pontuacaoAcumulada);
    
    // Dispara para o backend salvar o histórico (otimista, ignorar falha se endpoint não existir ainda)
    try {
      await apiFetch('/simulado/history', {
        method: 'POST',
        body: JSON.stringify({ acertos, respondidas: TOTAL_QUESTOES, xpGanho: pontuacaoAcumulada })
      });
    } catch {
      // Silencioso se endpoint mockado falhar
      console.warn("Rota /simulado/history não implementada no backend ainda.");
    } finally {
      setCarregando(false);
    }
  };

  const getNivelLabel = (n: NivelDificuldade) => {
    if (n === 1) return 'Fácil';
    if (n === 2) return 'Médio';
    return 'Difícil';
  };

  const getNivelVariant = (n: NivelDificuldade) => {
    if (n === 1) return 'success';
    if (n === 2) return 'warning';
    return 'error'; // vermelho para difícil
  };

  if (fase === 'config') {
    return (
      <div className="mx-auto flex h-[calc(100vh-9rem)] w-full max-w-2xl flex-col justify-center space-y-6 p-4 text-center">
        <h1 className="text-3xl font-extrabold">Simulado Adaptativo</h1>
        <p className="text-text-muted">
          Este simulado possui <strong className="text-text">{TOTAL_QUESTOES} questões</strong>. A dificuldade aumenta se você acertar e diminui se você errar. Preparado?
        </p>
        <Button size="lg" variant="cta" onClick={iniciarSimulado}>
          Começar Simulado
        </Button>
      </div>
    );
  }

  if (fase === 'resultado') {
    return (
      <div className="mx-auto flex h-[calc(100vh-9rem)] w-full max-w-2xl flex-col justify-center space-y-4 p-4 text-center">
        <Card variant="highlight" className="space-y-4 p-8 text-center">
          <h1 className="text-3xl font-extrabold">Simulado Concluído!</h1>
          <p className="text-lg text-text-muted">
            Você acertou <strong className="text-brand-primary">{acertos}</strong> de {TOTAL_QUESTOES}.
          </p>
          <div className="rounded-xl bg-surface-2 p-4 border border-border mt-4">
            <p className="text-sm font-semibold mb-1">XP Conquistado</p>
            <p className="text-4xl font-black text-brand-primary">+{pontuacaoAcumulada}</p>
          </div>
          <div className="pt-4 flex gap-3 justify-center">
            <Button asChild variant="secondary" size="lg">
              <Link href="/dashboard">Voltar ao Início</Link>
            </Button>
            <Button variant="cta" size="lg" onClick={iniciarSimulado}>
              Tentar Novamente
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!questaoAtual) return null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="info">{questaoAtual.area}</Badge>
            <Badge variant={getNivelVariant(nivelAtual)}>{getNivelLabel(nivelAtual)}</Badge>
          </div>
          <span className="text-sm text-text-muted">Questão {respondidas + 1} de {TOTAL_QUESTOES}</span>
        </div>
        <Progress value={respondidas} max={TOTAL_QUESTOES} gradient aria-label="Progresso do simulado" />
      </div>

      <h1 className="max-w-[70ch] text-lg font-semibold leading-relaxed">{questaoAtual.enunciado}</h1>

      <div role="radiogroup" aria-label="Alternativas" className="space-y-2">
        {questaoAtual.alternativas.map((a) => {
          let state: 'neutral' | 'correct' | 'incorrect' = 'neutral';
          if (revelado) {
            if (a.correta) state = 'correct';
            else if (a.id === picked) state = 'incorrect';
          } else if (a.id === picked) {
            state = 'neutral';
          }
          return (
            <OptionCard
              key={a.id}
              leading={a.id.toUpperCase()}
              title={a.texto}
              selected={picked === a.id}
              state={state}
              disabled={revelado}
              onClick={() => setPicked(a.id)}
            />
          );
        })}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        {!revelado ? (
          <Button variant="primary" onClick={handleResponder} disabled={picked == null}>
            Responder
          </Button>
        ) : (
          <Button variant="cta" onClick={proximaQuestao}>
            {respondidas + 1 >= TOTAL_QUESTOES ? 'Finalizar Simulado' : 'Próxima Questão'}
          </Button>
        )}
      </div>
    </div>
  );
}