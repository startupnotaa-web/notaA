import type { AreaConhecimento, ErroClassificacao } from './common';

// doc 05 §9 — Contratos internos Orquestração ↔ Motores. TS puro (não-HTTP,
// não-Zod): chamadas em processo dentro da API/Worker, implementadas em
// packages/engines/*. Nenhuma destas interfaces conhece HTTP, DB ou IA generativa
// (doc 03 §2/§6) — são o que mantém o domínio desacoplado da stack.

export interface ItemParams {
  itemId: string;
  area: AreaConhecimento;
  paramA: number; // discriminação
  paramB: number; // dificuldade
  paramC: number; // acerto casual
}

export interface MotorTRI {
  selectNextItem(input: {
    theta: number;
    area: AreaConhecimento;
    expostos: string[];
    pool: ItemParams[];
  }): { itemId: string };

  updateAbility(input: { theta: number; item: ItemParams; acerto: boolean; tempoMs: number }): {
    theta: number;
    erroPadrao: number;
  };

  probabilidadeAcerto(theta: number, item: ItemParams): number; // 3PL
}

export interface Perfil4D {
  eixoVisualVerbal: number;
  eixoAnaliticoHolistico: number;
  eixoSequencialAleatorio: number;
  eixoReflexivoImpulsivo: number;
}

export interface SinalComportamental {
  tipo: string; // ex.: tempo_resposta, padrao_navegacao, tipo_erro
  valor: unknown;
  capturadoEm: string;
}

export interface Recomendacao {
  eixo: keyof Perfil4D;
  descricao: string;
}

export interface CognitiveProfiler {
  update(input: { atual: Perfil4D; sinais: SinalComportamental[] }): {
    perfil: Perfil4D;
    confianca: number;
    recomendacoes: Recomendacao[];
  };
}

export interface Tentativa {
  itemId: string;
  acerto: boolean;
  tempoMs: number;
  criadoEm: string;
}

export interface ErrorDetector {
  /**
   * Heurística puramente comportamental: tempo desta tentativa vs padrão
   * recente do próprio estudante. `item`/`acerto` foram REMOVIDOS do contrato
   * (auditoria E10): os parâmetros TRI do banco estão `nao_calibrado` (Q-02) e
   * usá-los aqui seria inventar dado oficial; `acerto` é sempre false (a
   * Orquestração só chama isto em erro). A competência do item é persistida
   * pela camada de repositório (recordOcorrencia), não usada na classificação.
   */
  classify(input: {
    tempoMs: number;
    historicoRecente: Tentativa[];
  }): { classificacao: ErroClassificacao; evidencias: object; confianca: number };
}
