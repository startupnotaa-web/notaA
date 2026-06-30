import { z } from 'zod';
import { PapelSchema } from './common';

// Forma do JWT emitido pelo Supabase Auth (doc 03 §9, doc 10 §2). `papel` e
// `escola_id` vivem em app_metadata — imutável pelo cliente (só a API/Admin
// escreve nesse claim via Supabase Admin API). A API NUNCA confia em um papel
// vindo do corpo da requisição; sempre lê deste claim já verificado.
export const JwtAppMetadataSchema = z.object({
  papel: PapelSchema,
  escola_id: z.string().uuid().nullable().optional(),
});
export type JwtAppMetadata = z.infer<typeof JwtAppMetadataSchema>;

export const JwtClaimsSchema = z.object({
  sub: z.string().uuid(), // = usuario.id (mesma UUID do Supabase Auth — decisão registrada no doc 09)
  email: z.string().email().optional(),
  app_metadata: JwtAppMetadataSchema,
  exp: z.number().int(),
  iat: z.number().int(),
});
export type JwtClaims = z.infer<typeof JwtClaimsSchema>;

/**
 * Claim "crua" do Supabase Auth — usada SÓ no bootstrap de POST /auth/register
 * (doc 05 §2). Um usuário recém-criado via supabase.auth.signUp() ainda não
 * tem `app_metadata.papel` (só a API o escreve, via Supabase Admin API, DEPOIS
 * do registro) — exigir JwtClaimsSchema completo aqui seria impossível de
 * satisfazer (problema do ovo e da galinha). Esta verificação confirma só
 * assinatura + identidade (sub/email); RBAC continua exigindo o claim
 * completo em toda outra rota (AuthGuard normal).
 */
export const BootstrapJwtClaimsSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email().optional(),
  exp: z.number().int(),
  iat: z.number().int(),
});
export type BootstrapJwtClaims = z.infer<typeof BootstrapJwtClaimsSchema>;
