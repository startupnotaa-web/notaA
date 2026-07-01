import type { z } from 'zod';
import type { AreaConhecimento, ErroClassificacao, Papel, XpOrigem } from './common';
import type { ItemParams, Perfil4D, Recomendacao, Tentativa } from './engines';
import type { OnboardingState } from './onboarding';
import type { XpLedgerEntry } from './perfil';

// doc 05 §9 / doc 03 §4 — Portas (hexagonal). Implementadas por adaptadores em
// apps/api; trocar provedor de IA ou banco = trocar o adaptador, sem mudar quem
// consome a porta (doc 02 §4).

export interface UsoTokens {
  tokensIn: number;
  tokensOut: number;
  custoEstimado: number;
  latenciaMs: number;
}

// Único ponto de acesso a qualquer provedor de IA generativa — nenhuma outra
// parte do sistema importa um SDK de IA diretamente (doc 06 §1). `schema` valida
// a resposta estruturada (I5) antes que `complete` resolva.
export interface LLMProviderPort {
  complete<T>(input: {
    sistema: string; // prompt de sistema versionado (packages/prompts)
    prompt?: string; // a pergunta dinâmica do usuário
    contexto: object; // pacote montado pelo Context Builder — nunca pelo cliente
    schema: z.ZodSchema<T>;
  }): Promise<{ data: T; uso: UsoTokens }>;
}

// RepositoryPort: cada módulo da API (quiz, redacao, socratic, gamificacao...)
// define sua própria porta de repositório, específica aos agregados que usa —
// um único CRUD genérico não reflete os contratos reais do doc 05. As portas
// concretas (ex.: QuizRepositoryPort, RedacaoRepositoryPort) chegam junto com
// cada módulo, a partir do passo 6 (esqueleto NestJS) — ver docs/09 §5.
// Implementadas em packages/db (Drizzle) como adaptadores; nunca implementadas
// inline na camada de Orquestração (doc 03 §2).

// ── Passo 9 (fatia vertical E1→E2) — primeiras portas concretas ──

export interface OnboardingRepositoryPort {
  getState(estudanteId: string): Promise<OnboardingState>;
  saveStep(
    estudanteId: string,
    passo: number,
    dados: Record<string, unknown>,
  ): Promise<{ passoAtual: number; proximoPasso: number | null }>;
  /** Cria PerfilOnboarding.concluido_em + PerfilCognitivo4D inicial (doc 05 §3). */
  complete(estudanteId: string): Promise<void>;
}

// Item completo (com gabarito) — uso interno do repositório/serviço de quiz.
// ItemPublicoSchema (contracts/quiz.ts) é o que de fato vai ao cliente, SEM
// gabarito (H2.1, doc 08) — nunca confundir os dois tipos.
export interface BancoDeItemRegistro extends ItemParams {
  competencia: string;
  enunciado: string;
  alternativas: { id: string; texto: string }[];
  gabarito: string;
  /** Marcador de calibração (R3/I11, doc 04 §4) — nunca tratar como nota oficial sem validação. */
  naoCalibrado: boolean;
}

export interface QuizRepositoryPort {
  createSession(estudanteId: string, area: AreaConhecimento): Promise<{ sessaoId: string }>;
  getSession(
    sessaoId: string,
  ): Promise<{ id: string; estudanteId: string; status: string; area: AreaConhecimento } | null>;
  getHabilidade(
    estudanteId: string,
    area: AreaConhecimento,
  ): Promise<{ theta: number; erroPadrao: number }>;
  /**
   * `tentativaId` (opcional) liga o novo theta ao theta_evento append-only
   * (doc 04 §9) — vem do retorno de `recordAnswer`. Omitido em chamadas sem
   * tentativa correspondente (não deveria ocorrer no fluxo normal do E2).
   */
  setHabilidade(
    estudanteId: string,
    area: AreaConhecimento,
    theta: number,
    erroPadrao: number,
    tentativaId?: string,
  ): Promise<void>;
  getItemPool(area: AreaConhecimento): Promise<BancoDeItemRegistro[]>;
  getItem(itemId: string): Promise<BancoDeItemRegistro | null>;
  getExpostos(sessaoId: string): Promise<string[]>;
  /** Idempotente por idempotencyKey (doc 04 §4) — retorna `duplicate: true` em reenvio. */
  recordAnswer(input: {
    sessaoId: string;
    estudanteId: string;
    itemId: string;
    resposta: string;
    acerto: boolean;
    tempoRespostaMs: number;
    idempotencyKey: string;
    temasErro?: string[];
  }): Promise<{ duplicate: boolean; tentativaId: string | null }>;
  finishSession(sessaoId: string): Promise<void>;
  /**
   * Tentativas mais recentes do estudante NA MESMA área, mais antigas → mais
   * novas excluídas (a tentativa atual ainda não foi gravada quando isto é
   * chamado, doc 09 §6) — baseline comportamental para o ErrorDetector (E5).
   */
  getHistoricoRecente(estudanteId: string, area: AreaConhecimento, limit: number): Promise<Tentativa[]>;
}

// ── Fase 2 (E5) — Detector de Padrão de Erro ──

export interface ErrorDetectorRepositoryPort {
  /** Append-only (doc 04 §5) — uma `ocorrencia_erro` por tentativa errada classificada. */
  recordOcorrencia(input: {
    estudanteId: string;
    itemId: string | null;
    classificacao: ErroClassificacao;
    evidencias: object;
    confianca: number;
  }): Promise<void>;
}

// ── Fase 1 (E9) — Gamificação Core ──

export interface StreakState {
  diasConsecutivos: number;
  ultimaAtividadeValida: string | null; // ISO date (YYYY-MM-DD), não timestamp
  freezesDisponiveis: number;
}

export interface ConquistaCatalogo {
  codigo: string;
  xpAssociado: number;
}

export interface ConquistaConcedida {
  codigo: string;
  concedidoEm: string;
}

export interface GamificacaoRepositoryPort {
  /** Lançamento append-only (I7, doc 04 §7) — nunca UPDATE/DELETE. */
  grantXp(input: {
    estudanteId: string;
    origem: XpOrigem;
    valor: number;
    referenciaId?: string;
  }): Promise<void>;
  getXpTotal(estudanteId: string): Promise<number>;
  getXpLedger(
    estudanteId: string,
    pagination: { cursor?: string; limit: number },
  ): Promise<{ items: XpLedgerEntry[]; nextCursor: string | null }>;
  getStreak(estudanteId: string): Promise<StreakState>;
  /**
   * Registra UMA atividade válida no dia `dataAtividade` (YYYY-MM-DD, fuso do
   * estudante já resolvido pela Orquestração). Idempotente no mesmo dia.
   * Regra de continuidade/freeze é do GamificacaoService, não do repositório.
   */
  setStreak(estudanteId: string, novoEstado: StreakState): Promise<void>;
  getAchievementsCatalogo(): Promise<ConquistaCatalogo[]>;
  getAchievementsConcedidas(estudanteId: string): Promise<ConquistaConcedida[]>;
  /** Idempotente (PK composta estudante+conquista, doc 04 §7) — não concede 2×. */
  grantAchievement(estudanteId: string, codigo: string): Promise<{ granted: boolean }>;
  /** Sincroniza os caches de XP e Nível no perfil Cognitivo 4D (E9/Dashboard) */
  syncCachePerfil(
    estudanteId: string,
    cache: { xpTotal: number; nivelAtual: number; ofensivaDias: number },
  ): Promise<void>;
}

// ── Fase 1 (E3) — Cognitive Profiler ──

export interface PerfilCognitivoState {
  perfil: Perfil4D;
  confianca: number;
  recomendacoesAtivas: Recomendacao[];
}

export interface ProfilerRepositoryPort {
  /** `null` se o estudante ainda não tem PerfilCognitivo4D instanciado. */
  getPerfil(estudanteId: string): Promise<PerfilCognitivoState | null>;
  upsertPerfil(estudanteId: string, estado: PerfilCognitivoState): Promise<void>;
  /** Histórico append-only (doc 04 §3) — snapshot do perfil no momento da atualização. */
  appendEvento(estudanteId: string, estado: PerfilCognitivoState, motivo: string): Promise<void>;
}

// ── Fase 1 (E4) — Dashboard Core ──

export interface ThetaResumoArea {
  atual: number;
  serie: { t: string; v: number }[];
}

/**
 * Perfil combinado para o Dashboard (E4): junta `usuario` + `perfil_onboarding`
 * + `perfil_cognitivo_4d` e os contadores de progresso numa ÚNICA consulta
 * (performance — doc 05 §5). `perfil4d=null` enquanto o PerfilCognitivo4D não
 * foi instanciado (antes de concluir o onboarding).
 */
export interface DashboardResumoPerfil {
  nome: string | null;
  objetivoEnem: string | null;
  onboardingConcluido: boolean;
  perfil4d: {
    visualVerbal: number;
    analiticoHolistico: number;
    sequencialAleatorio: number;
    reflexivoImpulsivo: number;
    confianca: number;
  } | null;
  redacoesEnviadas: number;
  sessoesSocraticas: number;
}

export interface DashboardRepositoryPort {
  /** Só inclui áreas com pelo menos 1 theta_evento — sem inventar dado para área não tentada. */
  getThetaResumo(estudanteId: string): Promise<Partial<Record<AreaConhecimento, ThetaResumoArea>>>;
  /** Perfil + estatísticas combinadas (usuario + onboarding + 4D + contadores) em uma chamada. */
  getResumoPerfil(estudanteId: string): Promise<DashboardResumoPerfil>;
}

// ── Fase 1-UI (E1) — bootstrap de registro (doc 05 §2) ──

export interface UsuarioRegistro {
  id: string;
  /**
   * `Papel` (5 valores, doc 04 §2), não `TipoPerfilPublico` (3 valores do
   * formulário de cadastro) — quem se cadastra como "escola" se torna
   * `usuario.tipo_perfil = 'gestor'` (a pessoa que administra a Escola); a
   * entidade `escola` em si é criada/associada separadamente (fora do MVP de
   * registro). AuthService faz essa conversão ANTES de chamar esta porta.
   */
  tipoPerfil: Papel;
}

export interface UsuarioRepositoryPort {
  findByAuthUid(authUid: string): Promise<UsuarioRegistro | null>;
  create(input: {
    id: string;
    authUid: string;
    tipoPerfil: Papel;
    nome: string;
    email: string;
  }): Promise<void>;
}

/**
 * Escreve app_metadata.papel no Supabase Auth (Admin API, service role) — só
 * a API faz essa escrita (doc 03 §9). Porta estreita de propósito: nada além
 * do que o bootstrap de registro precisa atravessa esta interface.
 */
export interface AuthAdminPort {
  setPapel(authUid: string, papel: Papel, escolaId: string | null): Promise<void>;
}
