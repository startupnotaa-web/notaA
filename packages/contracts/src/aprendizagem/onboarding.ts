import { z } from 'zod';

// doc 05 §3 — Onboarding (E1), salvamento incremental (A6).
// Os 8 passos espelham docs/01-entendimento-produto.md (H1.2): nome, objetivo,
// estilo de aprendizagem, dificuldades, rotina, autopercepção, neurodivergência
// (opcional), confirmação. Só o payload do passo 2 é confirmado verbatim pelo
// doc 05; os demais são DRAFT de implementação — ajustar quando a UX de cada
// tela for desenhada, sem mudar o contrato de fundo (passoAtual incremental).

export const OnboardingStep1Schema = z.object({ 
  nome: z.string().min(1),
  idade: z.number().int().min(1),
  serie: z.string().min(1),
});

export const OnboardingStep2Schema = z.object({
  objetivoEnem: z.string().min(1),
  notaAlvo: z.number().int().min(0).max(1000).optional(),
});

export const OnboardingStep3Schema = z.object({
  estiloAprendizagemAutodeclarado: z.record(z.unknown()),
});

export const OnboardingStep4Schema = z.object({
  dificuldades: z.array(z.string()),
});

export const OnboardingStep5Schema = z.object({
  rotinaEstudo: z.record(z.unknown()),
});

export const OnboardingStep6Schema = z.object({
  autopercepcao: z.record(z.unknown()),
});

// Opcional por design (I10/doc 10) — pode ser pulado sem bloquear o onboarding.
export const OnboardingStep7Schema = z.object({
  neurodivergencia: z.record(z.boolean()).optional(),
  consentimentoBaseLegal: z.string().optional(),
});

export const OnboardingStep8Schema = z.object({ confirmado: z.literal(true) });

export const OnboardingStepSchemas = [
  OnboardingStep1Schema,
  OnboardingStep2Schema,
  OnboardingStep3Schema,
  OnboardingStep4Schema,
  OnboardingStep5Schema,
  OnboardingStep6Schema,
  OnboardingStep7Schema,
  OnboardingStep8Schema,
] as const;

export const OnboardingStepResponseSchema = z.object({
  passoAtual: z.number().int().min(1).max(8),
  proximoPasso: z.number().int().min(1).max(8).nullable(),
});
export type OnboardingStepResponse = z.infer<typeof OnboardingStepResponseSchema>;

export const OnboardingStateSchema = z.object({
  passoAtual: z.number().int().min(1).max(8),
  dados: z.record(z.unknown()),
  concluido: z.boolean(),
});
export type OnboardingState = z.infer<typeof OnboardingStateSchema>;
