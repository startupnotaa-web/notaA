import type { Perfil4D, Recomendacao, SinalComportamental } from '@notaa/contracts';
import { clampEixo } from './model';

// Sinal emitido pela Orquestração (apps/api) após cada resposta de quiz —
// única fonte de sinal disponível nesta fase (E2). `tipo` casa com a chave
// usada pelo ProfilerService ao montar SinalComportamental.
export const SINAL_RESPOSTA_QUIZ = 'resposta_quiz';

export interface SinalRespostaQuiz {
  tempoMs: number;
  acerto: boolean;
}

// Limiares de classificação rápida/lenta — heurística de produto (não é
// parâmetro ENEM a calibrar com especialista, ver model.ts). Ajustável.
const LIMIAR_RAPIDA_MS = 5_000;
const LIMIAR_LENTA_MS = 20_000;

const ALPHA_AJUSTE_EIXO = 0.15; // passo da média móvel exponencial por sinal aplicável

/**
 * Só nudga o eixo Reflexivo/Impulsivo (+1 = impulsivo, -1 = reflexivo) nos
 * dois casos em que velocidade de decisão e resultado não se confundem com
 * dificuldade do item ou domínio do conteúdo:
 *  - resposta RÁPIDA e ERRADA → indício de impulsividade.
 *  - resposta LENTA e CORRETA → indício de reflexão deliberada.
 * Os demais casos (rápida+certa, lenta+errada) são ambíguos demais (podem
 * refletir domínio ou dificuldade, não estilo) e são ignorados de propósito.
 */
export function aplicarSinalRespostaQuiz(
  perfil: Perfil4D,
  sinal: SinalRespostaQuiz,
): { perfil: Perfil4D; aplicado: boolean } {
  const { tempoMs, acerto } = sinal;
  let alvo: number | null = null;

  if (tempoMs < LIMIAR_RAPIDA_MS && !acerto) {
    alvo = 1; // impulsivo
  } else if (tempoMs > LIMIAR_LENTA_MS && acerto) {
    alvo = -1; // reflexivo
  }

  if (alvo === null) {
    return { perfil, aplicado: false };
  }

  const atual = perfil.eixoReflexivoImpulsivo;
  const novo = clampEixo(atual + ALPHA_AJUSTE_EIXO * (alvo - atual));
  return { perfil: { ...perfil, eixoReflexivoImpulsivo: novo }, aplicado: true };
}

export function isSinalRespostaQuiz(sinal: SinalComportamental): sinal is SinalComportamental & {
  valor: SinalRespostaQuiz;
} {
  return (
    sinal.tipo === SINAL_RESPOSTA_QUIZ &&
    typeof sinal.valor === 'object' &&
    sinal.valor !== null &&
    'tempoMs' in sinal.valor &&
    'acerto' in sinal.valor
  );
}

const LIMIAR_RECOMENDACAO = 0.4;

/** Recomendações só nos eixos com sinal real (Fase 1: só Reflexivo/Impulsivo). */
export function gerarRecomendacoes(perfil: Perfil4D): Recomendacao[] {
  const recomendacoes: Recomendacao[] = [];
  if (perfil.eixoReflexivoImpulsivo >= LIMIAR_RECOMENDACAO) {
    recomendacoes.push({
      eixo: 'eixoReflexivoImpulsivo',
      descricao: 'Tente respirar e reler a questão antes de responder — você tende a decidir rápido.',
    });
  } else if (perfil.eixoReflexivoImpulsivo <= -LIMIAR_RECOMENDACAO) {
    recomendacoes.push({
      eixo: 'eixoReflexivoImpulsivo',
      descricao: 'Confie mais na sua primeira leitura — você tende a demorar bastante para decidir.',
    });
  }
  return recomendacoes;
}
