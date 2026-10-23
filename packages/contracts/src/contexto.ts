import { z } from 'zod';
import { PapelSchema } from './common';

// Contexto de acesso: "como" a pessoa está usando a conta agora. Uma conta tem um papel (RBAC), mas
// pode atuar em mais de uma instituição (professor, aluno) ou para mais de um aluno (responsável).
// O contexto NÃO concede permissão: o servidor só confere se o vínculo existe, e a autorização
// continua no RBAC + RLS. Aditivo — nenhum contrato anterior muda.

export const ContextoDeAcessoSchema = z.object({
  papel: PapelSchema,
  instituicaoId: z.string().uuid().nullable(),
  /** Só no responsável: de qual aluno ele está cuidando. */
  estudanteId: z.string().uuid().nullable(),
});
export type ContextoDeAcesso = z.infer<typeof ContextoDeAcessoSchema>;

export const ContextoListadoSchema = ContextoDeAcessoSchema.extend({
  /** Texto para o seletor: nome da instituição ou do aluno. Só vai para o dono da conta. */
  rotulo: z.string(),
});
export type ContextoListado = z.infer<typeof ContextoListadoSchema>;

export const ContextosResponseSchema = z.object({
  contextos: z.array(ContextoListadoSchema),
});
export type ContextosResponse = z.infer<typeof ContextosResponseSchema>;

export const TrocarContextoRequestSchema = ContextoDeAcessoSchema;
export type TrocarContextoRequest = z.infer<typeof TrocarContextoRequestSchema>;

/** Cabeçalho HTTP com o contexto escolhido. A API revalida a cada requisição. */
export const CABECALHO_CONTEXTO = 'x-contexto';

const PARTE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** `papel:instituicaoId:estudanteId`, com campo vazio para null. */
export function serializarContexto(c: ContextoDeAcesso): string {
  return `${c.papel}:${c.instituicaoId ?? ''}:${c.estudanteId ?? ''}`;
}

/** Inverso de `serializarContexto`. Devolve null para qualquer coisa fora do formato. */
export function lerContexto(valor: string | undefined | null): ContextoDeAcesso | null {
  if (!valor || valor.length > 120) return null;
  const partes = valor.split(':');
  if (partes.length !== 3) return null;
  const [papel, instituicaoId, estudanteId] = partes as [string, string, string];
  if (instituicaoId !== '' && !PARTE_UUID.test(instituicaoId)) return null;
  if (estudanteId !== '' && !PARTE_UUID.test(estudanteId)) return null;
  const parsed = ContextoDeAcessoSchema.safeParse({
    papel,
    instituicaoId: instituicaoId || null,
    estudanteId: estudanteId || null,
  });
  return parsed.success ? parsed.data : null;
}

export function mesmoContexto(a: ContextoDeAcesso, b: ContextoDeAcesso): boolean {
  return a.papel === b.papel && a.instituicaoId === b.instituicaoId && a.estudanteId === b.estudanteId;
}

/** O contexto sem o rótulo de exibição, que é o que o cabeçalho e as rotas aceitam. */
export function semRotulo(c: ContextoListado): ContextoDeAcesso {
  return { papel: c.papel, instituicaoId: c.instituicaoId, estudanteId: c.estudanteId };
}
