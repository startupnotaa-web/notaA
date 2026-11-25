import { z } from 'zod';

export const StudentRiskSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  risco: z.enum(['baixo', 'medio', 'alto']),
  motivo: z.string(),
  streak: z.number().int(),
  xpTotal: z.number().int(),
});

export const ClassAnalyticsResponseSchema = z.object({
  totalAlunosAtivos: z.number().int(),
  mediaProgresso: z.number(),
  alunosEmRisco: z.array(StudentRiskSchema),
  areaMaisFragil: z
    .object({
      area: z.string(),
      mediaAcertos: z.number(),
    })
    .nullable(),
});

export type StudentRisk = z.infer<typeof StudentRiskSchema>;
export type ClassAnalyticsResponse = z.infer<typeof ClassAnalyticsResponseSchema>;
