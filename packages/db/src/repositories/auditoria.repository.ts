import type { DbExecutor } from '../client';
import { auditLog } from '../schema';

export interface EntradaAuditoria {
  instituicaoId: string | null;
  atorId: string | null;
  papel: string | null;
  /** Verbo no passado, por entidade: 'regra.criada', 'importacao.concluida'... */
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  dados?: Record<string, unknown>;
}

/**
 * Grava na trilha de auditoria da instituição (doc 10 §5). Recebe o executor
 * para entrar na MESMA transação da ação auditada: se a ação desfaz, o
 * registro desfaz junto, e não sobra auditoria de algo que não aconteceu.
 */
export async function registrarAuditoria(
  executor: DbExecutor,
  entradas: EntradaAuditoria | EntradaAuditoria[],
): Promise<void> {
  const lista = Array.isArray(entradas) ? entradas : [entradas];
  if (lista.length === 0) return;
  await executor.insert(auditLog).values(
    lista.map((e) => ({
      instituicaoId: e.instituicaoId,
      atorId: e.atorId,
      papel: e.papel,
      acao: e.acao,
      entidade: e.entidade,
      entidadeId: e.entidadeId ?? null,
      dados: e.dados ?? {},
    })),
  );
}
