import { z } from 'zod';
import { PapelSchema, TipoPerfilPublicoSchema } from './common';
import { Eixo4DSchema, NivelSchema } from './perfil';

// doc 05 §2 — Auth e perfil.
// Responsável/Admin NÃO se auto-cadastram (A2, doc 01) — recusados pela API.

export const RegisterRequestSchema = z
  .object({
    nome: z.string().min(1),
    email: z.string().email(),
    tipoPerfil: TipoPerfilPublicoSchema,
    /**
     * Nome da instituição — só para `tipoPerfil: 'instituicao'`. É o que permite
     * criar a linha em `instituicao` no momento do registro e amarrar o admin a
     * ela; sem isso o admin nascia sem instituição e o painel institucional ficava
     * sem dono. Estudante e professor não enviam este campo.
     */
    nomeInstituicao: z.string().trim().min(2, 'Informe o nome da instituição.').max(160).optional(),
  })
  .refine((body) => body.tipoPerfil !== 'instituicao' || !!body.nomeInstituicao, {
    message: 'Informe o nome da instituição.',
    path: ['nomeInstituicao'],
  });
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().nullable(),
  email: z.string().email(),
  tipoPerfil: PapelSchema,
  instituicaoId: z.string().uuid().nullable(),
  plano: z
    .object({
      tipo: z.enum(['free', 'plus', 'instituicao']),
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
  objetivo: z.string().nullable().optional(),
  estiloAprendizagem: z.array(z.string()).nullable().optional(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

// doc 05 §2 — PATCH /me. Edição de dados pessoais do próprio usuário. Hoje só
// `nome`: o e-mail é credencial do Supabase Auth e trocá-lo exige fluxo de
// reconfirmação por e-mail (fora deste escopo).
export const UpdateMeRequestSchema = z.object({
  nome: z.string().trim().min(1, 'Informe seu nome.').max(120, 'Nome muito longo.'),
  objetivoEnem: z.string().nullable().optional(),
  estiloAprendizagem: z.array(z.string()).nullable().optional(),
});
export type UpdateMeRequest = z.infer<typeof UpdateMeRequestSchema>;

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
