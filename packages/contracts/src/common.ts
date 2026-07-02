import { z } from 'zod';

// Tipos compartilhados entre todos os contratos. Espelham os enums do
// docs/04-modelo-de-dados.md, mas são definidos aqui de propósito (não importam
// @notaa/db) — apps/web nunca pode depender do pacote de persistência (doc 09 §2).

export const AreaConhecimentoSchema = z.enum([
  'linguagens', 
  'humanas', 
  'natureza', 
  'matematica',
  'redacao',
  'fin',
  'soc',
  'art'
]);
export type AreaConhecimento = z.infer<typeof AreaConhecimentoSchema>;

export const TipoPerfilPublicoSchema = z.enum(['estudante', 'professor', 'escola']);
export type TipoPerfilPublico = z.infer<typeof TipoPerfilPublicoSchema>;

// Os 5 papéis do RBAC (doc 10 §1). Só os 3 acima se auto-cadastram (A2) — Responsável
// entra por convite (VinculoResponsavel), Admin é provisionado internamente.
export const PapelSchema = z.enum(['estudante', 'professor', 'gestor', 'responsavel', 'admin']);
export type Papel = z.infer<typeof PapelSchema>;

export const ErroClassificacaoSchema = z.enum(['lacuna_conhecimento', 'deslize_atencao']);
export type ErroClassificacao = z.infer<typeof ErroClassificacaoSchema>;

// doc 04 §7 — origem do lançamento de XP (xp_ledger.origem).
export const XpOrigemSchema = z.enum([
  'quiz',
  'redacao',
  'streak',
  'conquista',
  'duelo',
  'reflexao_erro',
]);
export type XpOrigem = z.infer<typeof XpOrigemSchema>;

// Paginação por cursor (uuid v7) — doc 05 §1. `limit` chega como string de
// query param HTTP — z.coerce aceita "20" sem o controller precisar converter.
export const PaginationQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().uuid().nullable(),
  });
}
