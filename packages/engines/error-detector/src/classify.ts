import type { ErrorDetector, ErroClassificacao, Tentativa } from '@notaa/contracts';
import { confiancaPorVolume } from './model';

// doc 04 §5 / doc 05 §9 — Detector de Padrão de Erro (E5). Heurística própria
// de produto (como o Cognitive Profiler, doc 09 §3) — NÃO é instrumento oficial
// a calibrar com especialista; limiares abaixo são ajustáveis sem impacto em
// Q-02/03/06. Só faz sentido a Orquestração chamar isto quando `acerto = false`
// (a interface sempre devolve uma classificação, sem `null` — doc 05 §9).
//
// `item` (ItemParams) chega pela interface mas NÃO é usado na heurística: a
// dificuldade/discriminação do banco de itens está marcada `nao_calibrado`
// (Q-02) — usar a escala absoluta de param_b como "fácil"/"difícil" seria
// inventar dado oficial. O único sinal usado é comportamental: tempo e acerto
// desta tentativa comparados ao padrão recente do próprio estudante.

const RAZAO_RAPIDA = 0.6; // tempo desta tentativa < 60% do tempo médio recente do estudante
const TAXA_BOM_DESEMPENHO = 0.7; // ≥70% de acerto recente → domínio aparente do conteúdo
const TAXA_BAIXO_DESEMPENHO = 0.4; // ≤40% de acerto recente → padrão de dificuldade
const LIMIAR_RAPIDO_SEM_HISTORICO_MS = 4_000; // fallback sem baseline própria ainda (poucos dados)
const CONFIANCA_TETO_REGRA_CLARA = 0.85;
const CONFIANCA_TETO_FALLBACK = 0.4; // caso ambíguo — nunca tão confiante quanto uma regra clara

type Regra = 'rapido_e_bom_desempenho' | 'lento_e_baixo_desempenho' | 'fallback_ambiguo' | 'sem_historico';

interface Evidencias {
  tempoMs: number;
  tempoMedioRecente: number | null;
  taxaAcertoRecente: number | null;
  nHistorico: number;
  regra: Regra;
}

function media(valores: number[]): number {
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

export function classify(input: {
  tempoMs: number;
  historicoRecente: Tentativa[];
}): { classificacao: ErroClassificacao; evidencias: Evidencias; confianca: number } {
  const { tempoMs, historicoRecente } = input;
  const n = historicoRecente.length;

  // Sem baseline própria — única opção é um limiar absoluto fraco, com
  // confiança praticamente nula (não há padrão do estudante para comparar).
  if (n === 0) {
    const classificacao: ErroClassificacao =
      tempoMs < LIMIAR_RAPIDO_SEM_HISTORICO_MS ? 'deslize_atencao' : 'lacuna_conhecimento';
    return {
      classificacao,
      evidencias: {
        tempoMs,
        tempoMedioRecente: null,
        taxaAcertoRecente: null,
        nHistorico: 0,
        regra: 'sem_historico',
      },
      confianca: confiancaPorVolume(0, CONFIANCA_TETO_FALLBACK),
    };
  }

  const tempoMedioRecente = media(historicoRecente.map((t) => t.tempoMs));
  const taxaAcertoRecente = media(historicoRecente.map((t) => (t.acerto ? 1 : 0)));

  // Caso claro 1: respondeu rápido demais (p/ o próprio padrão) E vem de um
  // histórico recente bom — erro isolado em meio a domínio aparente = deslize.
  if (tempoMs < tempoMedioRecente * RAZAO_RAPIDA && taxaAcertoRecente >= TAXA_BOM_DESEMPENHO) {
    return {
      classificacao: 'deslize_atencao',
      evidencias: {
        tempoMs,
        tempoMedioRecente,
        taxaAcertoRecente,
        nHistorico: n,
        regra: 'rapido_e_bom_desempenho',
      },
      confianca: confiancaPorVolume(n, CONFIANCA_TETO_REGRA_CLARA),
    };
  }

  // Caso claro 2: não foi às pressas E vem de um histórico recente fraco —
  // dificuldade recorrente no conteúdo = lacuna.
  if (tempoMs >= tempoMedioRecente && taxaAcertoRecente <= TAXA_BAIXO_DESEMPENHO) {
    return {
      classificacao: 'lacuna_conhecimento',
      evidencias: {
        tempoMs,
        tempoMedioRecente,
        taxaAcertoRecente,
        nHistorico: n,
        regra: 'lento_e_baixo_desempenho',
      },
      confianca: confiancaPorVolume(n, CONFIANCA_TETO_REGRA_CLARA),
    };
  }

  // Ambíguo (ex.: histórico misto, ou rápido+histórico fraco, ou lento+histórico
  // bom) — ainda assim a interface exige uma classificação; usa só a velocidade
  // relativa como critério de desempate, com confiança baixa de propósito.
  const classificacao: ErroClassificacao = tempoMs < tempoMedioRecente ? 'deslize_atencao' : 'lacuna_conhecimento';
  return {
    classificacao,
    evidencias: { tempoMs, tempoMedioRecente, taxaAcertoRecente, nHistorico: n, regra: 'fallback_ambiguo' },
    confianca: confiancaPorVolume(n, CONFIANCA_TETO_FALLBACK),
  };
}

export const errorDetector: ErrorDetector = { classify };
