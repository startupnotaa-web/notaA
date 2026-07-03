import { z } from 'zod';
import { XpOrigemSchema } from './common';

// doc 05 §5 — Perfil cognitivo, dashboard, gamificação.

export const CognitiveProfileResponseSchema = z.object({
  eixoVisualVerbal: z.number().min(-1).max(1),
  eixoAnaliticoHolistico: z.number().min(-1).max(1),
  eixoSequencialAleatorio: z.number().min(-1).max(1),
  eixoReflexivoImpulsivo: z.number().min(-1).max(1),
  confianca: z.number().min(0).max(1),
  recomendacoesAtivas: z.array(z.string()),
});
export type CognitiveProfileResponse = z.infer<typeof CognitiveProfileResponseSchema>;

// Nível provisório derivado do XP (curva linear — Q-05/gamificação ainda não
// calibrada; ver dashboard.service `calcularNivel`). `naoCalibrado=true` avisa o
// cliente que NÃO é um sistema de progressão oficial/balanceado.
export const NivelSchema = z.object({
  atual: z.number().int().min(1),
  xpNoNivel: z.number().int().min(0),
  xpParaProximoNivel: z.number().int().min(1),
  progresso: z.number().min(0).max(1), // fração já conquistada dentro do nível atual
  naoCalibrado: z.boolean(),
});
export type Nivel = z.infer<typeof NivelSchema>;

// Um eixo do Perfil Cognitivo 4D, pronto para alimentar o radar do dashboard.
// `valor` em [-1, 1] (−1 = poloA, +1 = poloB, 0 = neutro). `temSinal=false` =>
// ainda sem sinal comportamental próprio: o cliente deve exibir "aguardando
// sinal" e nunca tratar a posição neutra como inferência real (doc 04 §3 —
// "nunca fabricar posição sem sinal"). Na Fase 1 só Reflexivo↔Impulsivo tem sinal.
export const Eixo4DSchema = z.object({
  chave: z.string(),
  poloA: z.string(),
  poloB: z.string(),
  valor: z.number().min(-1).max(1),
  temSinal: z.boolean(),
});
export type Eixo4D = z.infer<typeof Eixo4DSchema>;

export const DashboardResponseSchema = z.object({
  // Dados do perfil (nome + objetivo coletado no onboarding) — doc 05 §2/§3.
  perfil: z.object({
    nome: z.string().nullable(),
    objetivoEnem: z.string().nullable(),
    onboardingConcluido: z.boolean(),
  }),
  estimativaNota: z.object({
    geral: z.number().int().min(0).max(1000),
    porArea: z.record(z.string(), z.number()), // chave = AreaConhecimento
    naoCalibrado: z.boolean(), // Q-06 — mapa theta→nota ainda não calibrado oficialmente
  }),
  // Gamificação (E9): XP total, nível atual (provisório) e ofensiva de dias.
  nivel: NivelSchema,
  xpTotal: z.number().int(),
  streak: z.object({
    diasConsecutivos: z.number().int().min(0),
    freezesDisponiveis: z.number().int().min(0),
    ultimaAtividade: z.string().nullable(),
  }),
  // Perfil Cognitivo 4D (E3) — array de eixos para o gráfico de radar.
  perfilCognitivo4d: z.object({
    confianca: z.number().min(0).max(1),
    eixos: z.array(Eixo4DSchema),
  }),
  theta: z.record(
    z.string(),
    z.object({
      atual: z.number(),
      serie: z.array(z.object({ t: z.string(), v: z.number() })),
    }),
  ),
  // Progresso resumido do estudo aprofundado (E7/E8) — contadores diretos.
  progresso: z.object({
    redacoesEnviadas: z.number().int().min(0),
    sessoesSocraticas: z.number().int().min(0),
  }),
});
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;

export const StreakResponseSchema = z.object({
  diasConsecutivos: z.number().int().min(0),
  ultimaAtividade: z.string().nullable(),
  freezesDisponiveis: z.number().int().min(0),
});
export type StreakResponse = z.infer<typeof StreakResponseSchema>;

export const AchievementSchema = z.object({
  codigo: z.string(),
  xpAssociado: z.number().int(),
  concedidoEm: z.string().nullable(), // null = ainda bloqueada
});

export const AchievementsResponseSchema = z.object({
  desbloqueadas: z.array(AchievementSchema),
  bloqueadas: z.array(AchievementSchema),
});
export type AchievementsResponse = z.infer<typeof AchievementsResponseSchema>;

export const XpLedgerEntrySchema = z.object({
  id: z.string().uuid(),
  origem: XpOrigemSchema,
  valor: z.number().int(),
  criadoEm: z.string(),
});
export type XpLedgerEntry = z.infer<typeof XpLedgerEntrySchema>;
