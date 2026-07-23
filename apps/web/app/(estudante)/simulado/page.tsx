'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { QuestaoSimuladoResponse, StartSimuladoSessionResponse, AreaConhecimento } from '@notaa/contracts';
import { Badge, Button, Card, OptionCard, Progress, cn } from '@notaa/ui';
import { useUser } from '../../../lib/user-context';
import { apiFetch } from '../../../lib/api-client';
import { toast } from '../../components/toast';

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
  const [nivelAtual, setNivelAtual] = useState<NivelDificuldade>(2);
  
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [questaoAtual, setQuestaoAtual] = useState<QuestaoSimulado | null>(null);
  
  const [respondidas, setRespondidas] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [pontuacaoAcumulada, setPontuacaoAcumulada] = useState(0);
  
  const [picked, setPicked] = useState<string | null>(null);
  const [revelado, setRevelado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Estados de configuração
  const [areaSelecionada, setAreaSelecionada] = useState<AreaConhecimento>('matematica');
  const [quantidadeQuestoes, setQuantidadeQuestoes] = useState<number>(8);
  const [nivelInicial, setNivelInicial] = useState<'auto' | 1 | 2 | 3>('auto');

  const obterProximaQuestao = async (nivelDesejado: NivelDificuldade | undefined): Promise<QuestaoSimulado | null> => {
    if (!sessaoId) return null;
    
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (nivelDesejado !== undefined) params.set('nivel', String(nivelDesejado));

      const data = await apiFetch<QuestaoSimuladoResponse>(`/simulado/sessions/${sessaoId}/next-item?${params.toString()}`, {
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
    setCarregando(true);
    try {
      const payload = {
        area: areaSelecionada,
        quantidade: quantidadeQuestoes,
        ...(nivelInicial !== 'auto' && { nivel: nivelInicial })
      };

      const data = await apiFetch<StartSimuladoSessionResponse>('/simulado/sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSessaoId(data.sessaoId);
      
      setFase('simulado');
      setRespondidas(0);
      setAcertos(0);
      setPontuacaoAcumulada(0);
      setPicked(null);
      setRevelado(false);

      if (data.primeiraQuestao) {
        setNivelAtual(data.primeiraQuestao.nivel as NivelDificuldade);
        setQuestaoAtual({
          id: data.primeiraQuestao.id,
          enunciado: data.primeiraQuestao.enunciado,
          alternativas: data.primeiraQuestao.alternativas,
          nivel: data.primeiraQuestao.nivel as NivelDificuldade,
          area: data.primeiraQuestao.area,
        });
      } else {
        toast('Nenhuma questão encontrada para os filtros selecionados.', { variant: 'error' });
        setFase('config');
      }
    } catch (err) {
      toast('Erro ao iniciar simulado. Verifique os dados e tente novamente.', { variant: 'error' });
    } finally {
      setCarregando(false);
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

    if (respondidas + 1 >= quantidadeQuestoes) {
      finalizarSimulado();
    } else {
      const prox = await obterProximaQuestao(proximoNivel);
      if (prox) {
        setQuestaoAtual(prox);
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
        body: JSON.stringify({ acertos, respondidas: quantidadeQuestoes, xpGanho: pontuacaoAcumulada })
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
      <div className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-2xl flex-col justify-center space-y-6 p-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold">Simulado Adaptativo</h1>
          <p className="text-text-muted">
            Configure seu simulado e teste seus conhecimentos.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text">Área de Conhecimento</label>
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm ring-offset-background placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
              value={areaSelecionada}
              onChange={(e) => setAreaSelecionada(e.target.value as AreaConhecimento)}
              disabled={carregando}
            >
              <option value="linguagens">Linguagens, Códigos e suas Tecnologias</option>
              <option value="matematica">Matemática e suas Tecnologias</option>
              <option value="natureza">Ciências da Natureza e suas Tecnologias</option>
              <option value="humanas">Ciências Humanas e suas Tecnologias</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text">Quantidade de Questões</label>
            <input
              type="number"
              min={1}
              max={90}
              value={quantidadeQuestoes}
              onChange={(e) => setQuantidadeQuestoes(parseInt(e.target.value) || 1)}
              className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={carregando}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text">Nível de Dificuldade Inicial</label>
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm ring-offset-background placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
              value={nivelInicial}
              onChange={(e) => setNivelInicial(e.target.value === 'auto' ? 'auto' : parseInt(e.target.value) as 1 | 2 | 3)}
              disabled={carregando}
            >
              <option value="auto">Automático (Baseado na sua Proficiência)</option>
              <option value={1}>Fácil</option>
              <option value={2}>Médio</option>
              <option value={3}>Difícil</option>
            </select>
          </div>
        </Card>

        <div className="text-center pt-4">
          <Button size="lg" variant="cta" onClick={iniciarSimulado} disabled={carregando}>
            {carregando ? 'Preparando...' : 'Começar Simulado'}
          </Button>
        </div>
      </div>
    );
  }

  if (fase === 'resultado') {
    return (
      <div className="mx-auto flex h-[calc(100vh-9rem)] w-full max-w-2xl flex-col justify-center space-y-4 p-4 text-center">
        <Card variant="highlight" className="space-y-4 p-8 text-center">
          <h1 className="text-3xl font-extrabold">Simulado Concluído!</h1>
          <p className="text-lg text-text-muted">
            Você acertou <strong className="text-brand-primary">{acertos}</strong> de {quantidadeQuestoes}.
          </p>
          <div className="rounded-xl bg-surface-2 p-4 border border-border mt-4">
            <p className="text-sm font-semibold mb-1">XP Conquistado</p>
            <p className="text-4xl font-black text-brand-primary">+{pontuacaoAcumulada}</p>
          </div>
          <div className="pt-4 flex gap-3 justify-center">
            <Button asChild variant="secondary" size="lg">
              <Link href="/dashboard">Voltar ao Início</Link>
            </Button>
            <Button variant="cta" size="lg" onClick={() => setFase('config')}>
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
          <span className="text-sm text-text-muted">Questão {respondidas + 1} de {quantidadeQuestoes}</span>
        </div>
        <Progress value={respondidas} max={quantidadeQuestoes} gradient aria-label="Progresso do simulado" />
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
            {respondidas + 1 >= quantidadeQuestoes ? 'Finalizar Simulado' : 'Próxima Questão'}
          </Button>
        )}
      </div>
    </div>
  );
}