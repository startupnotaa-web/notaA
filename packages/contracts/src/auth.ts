import { z } from 'zod';
import { PapelSchema, TipoPerfilPublicoSchema } from './common';
import { Eixo4DSchema, NivelSchema } from './perfil';

// doc 05 §2 — Auth e perfil.
// Responsável/Admin NÃO se auto-cadastram (A2, doc 01) — recusados pela API.

export const RegisterRequestSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  tipoPerfil: TipoPerfilPublicoSchema,
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().nullable(),
  email: z.string().email(),
  tipoPerfil: PapelSchema,
  escolaId: z.string().uuid().nullable(),
  plano: z
    .object({
      tipo: z.enum(['free', 'plus', 'escola']),
      status: z.enum(['ativa', 'inadimplente', 'cancelada']),
    })
    .nullable(),
  gamificacao: z
    .object({
      nivel: NivelSchema,
      xpTotal: z.number().int(),
      ofensivaDias: z.number().int().min(0),
    })
    .nullable(),
  perfilCognitivo: z
    .object({
      confianca: z.number().min(0).max(1),
      eixos: z.array(Eixo4DSchema),
    })
    .nullable(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

// doc 05 §2 — PATCH /me. Edição de dados pessoais do próprio usuário. Hoje só
// `nome`: o e-mail é credencial do Supabase Auth e trocá-lo exige fluxo de
// reconfirmação por e-mail (fora deste escopo).
export const UpdateMeRequestSchema = z.object({
  nome: z.string().trim().min(1, 'Informe seu nome.').max(120, 'Nome muito longo.'),
});
export type UpdateMeRequest = z.infer<typeof UpdateMeRequestSchema>;

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
