import { eq } from 'drizzle-orm';
import type { InstituicaoRepositoryPort } from '@notaa/contracts';
import type { Database } from '../client';
import { instituicao, usuario } from '../schema';

/**
 * Adaptador Drizzle real de InstituicaoRepositoryPort (doc 04 §2).
 *
 * Fecha o buraco do bootstrap de registro: quem escolhia "Represento uma
 instituição" virava `admin_instituicao` com `instituicao_id = null` e nenhuma
 * linha era criada em `instituicao`. O admin ficava sem instituição para
 * administrar e não havia
 * entidade à qual um aluno pudesse se vincular mais tarde.
 */
export class InstituicaoRepositoryDb implements InstituicaoRepositoryPort {
  constructor(private readonly db: Database) {}

  async criarParaAdmin(input: { nome: string; adminId: string }): Promise<{ id: string; nome: string }> {
    // Transação: criar a instituição e amarrar o admin são um passo só. Se o
    // UPDATE falhasse depois do INSERT, sobraria uma instituição sem ninguém que a
    // administre — invisível no painel e impossível de corrigir pela aplicação.
    return this.db.transaction(async (tx) => {
      const [criada] = await tx
        .insert(instituicao)
        .values({ nome: input.nome })
        .returning({ id: instituicao.id, nome: instituicao.nome });

      if (!criada) {
        throw new Error('INSERT em `instituicao` não retornou a linha criada.');
      }

      await tx
        .update(usuario)
        .set({ instituicaoId: criada.id, atualizadoEm: new Date() })
        .where(eq(usuario.id, input.adminId));

      return criada;
    });
  }
}
