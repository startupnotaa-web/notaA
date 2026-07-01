import { z } from 'zod';

export const StudyTrailStepSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().min(1),
  dica: z.string().optional(),
});
export type StudyTrailStep = z.infer<typeof StudyTrailStepSchema>;

export const StudyTrailResponseSchema = z.object({
  id: z.string().uuid(),
  titulo: z.string(),
  descricao: z.string(),
  passos: z.array(StudyTrailStepSchema),
  criadoEm: z.string(),
});
export type StudyTrailResponse = z.infer<typeof StudyTrailResponseSchema>;

// For the Gemini prompt return type
export const GeminiStudyTrailSchema = z.object({
  titulo: z.string(),
  descricao: z.string(),
  passos: z.array(StudyTrailStepSchema),
});
