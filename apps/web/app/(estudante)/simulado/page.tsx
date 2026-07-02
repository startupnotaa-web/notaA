'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, OptionCard, Progress, cn } from '@notaa/ui';
import { useUser } from '../../../lib/user-context';
import { apiFetch } from '../../../lib/api-client';
import { toast } from '../../components/toast';

const TOTAL_QUESTOES = 8;
const XP_POR_ACERTO = 50; // XP base por acerto (pode ser multiplicado pelo nível)

type NivelDificuldade = 1 | 2 | 3;
type FaseSimulado = 'config' | 'simulado' | 'resultado';

interface MockQuestao {
  id: string;
  enunciado: string;
  alternativas: { id: string; texto: string; correta: boolean }[];
  nivel: NivelDificuldade;
  area: string;
}

// Mocks de Questões (Substituir pela IA futuramente)
const MOCK_QUESTOES: MockQuestao[] = [
  { id: 'f1', enunciado: 'Quanto é 2 + 2?', alternativas: [{ id: 'a', texto: '3', correta: false }, { id: 'b', texto: '4', correta: true }], nivel: 1, area: 'Matemática' },
  { id: 'f2', enunciado: 'O sol é uma estrela?', alternativas: [{ id: 'a', texto: 'Sim', correta: true }, { id: 'b', texto: 'Não', correta: false }], nivel: 1, area: 'Natureza' },
  { id: 'f3', enunciado: 'Capital do Brasil?', alternativas: [{ id: 'a', texto: 'RJ', correta: false }, { id: 'b', texto: 'Brasília', correta: true }], nivel: 1, area: 'Humanas' },
  { id: 'f4', enunciado: 'A água ferve a 100°C?', alternativas: [{ id: 'a', texto: 'Sim', correta: true }, { id: 'b', texto: 'Não', correta: false }], nivel: 1, area: 'Natureza' },
  { id: 'f5', enunciado: 'Qual o maior planeta?', alternativas: [{ id: 'a', texto: 'Terra', correta: false }, { id: 'b', texto: 'Júpiter', correta: true }], nivel: 1, area: 'Natureza' },
  
  { id: 'm1', enunciado: 'Qual a raiz de 144?', alternativas: [{ id: 'a', texto: '12', correta: true }, { id: 'b', texto: '14', correta: false }], nivel: 2, area: 'Matemática' },
  { id: 'm2', enunciado: 'Quem descobriu o Brasil?', alternativas: [{ id: 'a', texto: 'Pedro Álvares Cabral', correta: true }, { id: 'b', texto: 'Cristóvão Colombo', correta: false }], nivel: 2, area: 'Humanas' },
  { id: 'm3', enunciado: 'Cálculo de área de um triângulo?', alternativas: [{ id: 'a', texto: 'b*h/2', correta: true }, { id: 'b', texto: 'b*h', correta: false }], nivel: 2, area: 'Matemática' },
  { id: 'm4', enunciado: 'O que é fotossíntese?', alternativas: [{ id: 'a', texto: 'Processo das plantas', correta: true }, { id: 'b', texto: 'Respiração', correta: false }], nivel: 2, area: 'Natureza' },
  { id: 'm5', enunciado: 'Traduza "Book" para português.', alternativas: [{ id: 'a', texto: 'Livro', correta: true }, { id: 'b', texto: 'Caderno', correta: false }], nivel: 2, area: 'Linguagens' },

  { id: 'd1', enunciado: 'Qual a derivada de x²?', alternativas: [{ id: 'a', texto: '2x', correta: true }, { id: 'b', texto: 'x', correta: false }], nivel: 3, area: 'Matemática' },
  { id: 'd2', enunciado: 'O que é a Teoria da Relatividade?', alternativas: [{ id: 'a', texto: 'Física Clássica', correta: false }, { id: 'b', texto: 'E=mc²', correta: true }], nivel: 3, area: 'Natureza' },
  { id: 'd3', enunciado: 'Qual autor escreveu Dom Casmurro?', alternativas: [{ id: 'a', texto: 'Machado de Assis', correta: true }, { id: 'b', texto: 'José de Alencar', correta: false }], nivel: 3, area: 'Linguagens' },
  { id: 'd4', enunciado: 'Fórmula de Bhaskara?', alternativas: [{ id: 'a', texto: '(-b +- raiz(delta))/2a', correta: true }, { id: 'b', texto: 'b² - 4ac', correta: false }], nivel: 3, area: 'Matemática' },
  { id: 'd5', enunciado: 'O que foi a Guerra Fria?', alternativas: [{ id: 'a', texto: 'Conflito ideológico', correta: true }, { id: 'b', texto: 'Guerra de inverno', correta: false }], nivel: 3, area: 'Humanas' },
];

export default function SimuladoPage() {
  const { addXP } = useUser();
  const [fase, setFase] = useState<FaseSimulado>('config');
  const [nivelAtual, setNivelAtual] = useState<NivelDificuldade>(2); // Inicia no médio
  
  const [questoesJogadas, setQuestoesJogadas] = useState<Set<string>>(new Set());
  const [questaoAtual, setQuestaoAtual] = useState<MockQuestao | null>(null);
  
  const [respondidas, setRespondidas] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [pontuacaoAcumulada, setPontuacaoAcumulada] = useState(0);
  
  const [picked, setPicked] = useState<string | null>(null);
  const [revelado, setRevelado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const obterProximaQuestao = async (nivelDesejado: NivelDificuldade) => {
    try {
      setCarregando(true);
      const res = await apiFetch('/quiz/generate', {
        method: 'POST',
        body: JSON.stringify({
          tema: 'Assuntos do ENEM (Matemática, Linguagens, Humanas ou Natureza)',
          dificuldadeDesejada: nivelDesejado === 1 ? 'Fácil' : nivelDesejado === 2 ? 'Média' : 'Difícil'
        })
      });
      const data = await res.json();
      
      return {
        id: Math.random().toString(36).substring(7),
        enunciado: data.enunciado,
        alternativas: data.alternativas.map((alt: string, index: number) => ({
          id: String.fromCharCode(97 + index), // a, b, c, d, e
          texto: alt,
          correta: index === data.correta
        })),
        nivel: nivelDesejado,
        area: 'Simulado Adaptativo IA',
        dicaPerfil: data.dica_perfil,
        explicacao: data.explicacao
      };
    } catch (err) {
      toast({ title: 'Erro ao gerar questão', description: 'Tente novamente.', variant: 'error' });
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
    setNivelAtual(2);
    setPicked(null);
    setRevelado(false);
    
    const primeira = await obterProximaQuestao(2);
    if (primeira) {
      setQuestaoAtual(primeira);
      setQuestoesJogadas(new Set([primeira.id]));
    }
  };

  const handleResponder = () => {
    if (!picked || !questaoAtual) return;
    
    setRevelado(true);
    const acertou = questaoAtual.alternativas.find((a: any) => a.id === picked)?.correta;
    
    if (acertou) {
      setAcertos(prev => prev + 1);
      const xpGanho = XP_POR_ACERTO * nivelAtual; 
      setPontuacaoAcumulada(prev => prev + xpGanho);
    }
  };

  const proximaQuestao = async () => {
    if (!questaoAtual) return;

    const acertou = questaoAtual.alternativas.find((a: any) => a.id === picked)?.correta;
    
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
      const prox = await obterProximaQuestao(proximoNivel);
      if (prox) {
        setQuestaoAtual(prox as any);
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