import { z } from 'zod';

export const BattleAreaSchema = z.enum([
  'linguagens',
  'humanas',
  'natureza',
  'matematica',
]);
export type BattleArea = z.infer<typeof BattleAreaSchema>;

export const MatchmakeRequestSchema = z.object({
  area: BattleAreaSchema,
});
export type MatchmakeRequest = z.infer<typeof MatchmakeRequestSchema>;

export const BattleQuestionSchema = z.object({
  id: z.string(),
  enunciado: z.string(),
  alternativas: z.array(
    z.object({
      id: z.string(),
      texto: z.string(),
    })
  ),
  corretaId: z.string(),
});
export type BattleQuestion = z.infer<typeof BattleQuestionSchema>;

export const MatchmakeResponseSchema = z.object({
  batalhaId: z.string().optional(), // ID da batalha_pvp fantasma. Se for bot, não tem.
  questoes: z.array(BattleQuestionSchema),
  oponente: z.object({
    nome: z.string(),
    avatarUrl: z.string().nullable().optional(),
    level: z.number().optional(),
    isBot: z.boolean(),
  }),
  tempoRespostas: z.array(
    z.object({
      questaoId: z.string(),
      tempoSegundos: z.number(),
      acertou: z.boolean(),
    })
  ),
});
export type MatchmakeResponse = z.infer<typeof MatchmakeResponseSchema>;

export const FinishBattleRequestSchema = z.object({
  area: BattleAreaSchema,
  questoes: z.array(BattleQuestionSchema),
  tempoRespostas: z.array(
    z.object({
      questaoId: z.string(),
      tempoSegundos: z.number(),
      acertou: z.boolean(),
    })
  ),
  scoreFinal: z.number(),
});
export type FinishBattleRequest = z.infer<typeof FinishBattleRequestSchema>;

export const FinishBattleResponseSchema = z.object({
  sucesso: z.boolean(),
  id: z.string(),
});
export type FinishBattleResponse = z.infer<typeof FinishBattleResponseSchema>;
