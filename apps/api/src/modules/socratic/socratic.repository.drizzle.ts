import { Inject, Injectable } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import type { Database } from '@notaa/db';
import { conversaSocratica, mensagemSocratica, usuario, asc, desc, eq, inArray, count } from '@notaa/db';
import {
  MOCK_DEV_USER_ID,
  MOCK_DEV_USER_EMAIL,
  MOCK_DEV_USER_NOME,
  isDevBypassEnabled,
} from '../../common/dev-user';
import type { SocraticRepositoryPort } from './socratic.repository.memory';

/**
 * Adaptador Drizzle real de SocraticRepositoryPort (conversa_socratica +
 * mensagem_socratica, doc 04 §6). O enum mensagem_papel já é
 * ['estudante','tutor','sistema'] — o mesmo papel usado pelo SocraticService.
 */
@Injectable()
export class SocraticRepositoryDrizzle implements SocraticRepositoryPort {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async criarConversa(input: {
    estudanteId: string;
    temaAtivo?: string;
    sessaoId?: string;
  }): Promise<{ conversaId: string }> {
    await this.garantirUsuarioMockDev(input.estudanteId);

    const [row] = await this.db
      .insert(conversaSocratica)
      .values({
        estudanteId: input.estudanteId,
        temaAtivo: input.temaAtivo ?? null,
        // sessaoId tem FK para sessao_avaliativa; só vincula se vier um id válido.
        sessaoId: input.sessaoId ?? null,
      })
      .returning({ id: conversaSocratica.id });

    return { conversaId: row!.id };
  }

  async buscarConversa(conversaId: string) {
    const [row] = await this.db
      .select({
        id: conversaSocratica.id,
        estudanteId: conversaSocratica.estudanteId,
        temaAtivo: conversaSocratica.temaAtivo,
        resumoContexto: conversaSocratica.resumoContexto,
      })
      .from(conversaSocratica)
      .where(eq(conversaSocratica.id, conversaId))
      .limit(1);
    return row ?? null;
  }

  async adicionarMensagem(input: {
    conversaId: string;
    papel: 'estudante' | 'tutor' | 'sistema';
    conteudo: string;
    estadoMaquina?: string;
  }): Promise<{ mensagemId: string }> {
    const [row] = await this.db
      .insert(mensagemSocratica)
      .values({
        conversaId: input.conversaId,
        papel: input.papel,
        conteudo: input.conteudo,
        estadoMaquina: input.estadoMaquina ?? null,
      })
      .returning({ id: mensagemSocratica.id });
    return { mensagemId: row!.id };
  }

  async listarMensagens(conversaId: string) {
    const rows = await this.db
      .select({
        id: mensagemSocratica.id,
        papel: mensagemSocratica.papel,
        conteudo: mensagemSocratica.conteudo,
        criadoEm: mensagemSocratica.criadoEm,
      })
      .from(mensagemSocratica)
      .where(eq(mensagemSocratica.conversaId, conversaId))
      .orderBy(asc(mensagemSocratica.criadoEm));
    return rows.map((m) => ({
      id: m.id,
      papel: m.papel,
      conteudo: m.conteudo,
      criadoEm: m.criadoEm.toISOString(),
    }));
  }

  async atualizarResumoContexto(conversaId: string, resumo: string): Promise<void> {
    await this.db
      .update(conversaSocratica)
      .set({ resumoContexto: resumo, atualizadoEm: new Date() })
      .where(eq(conversaSocratica.id, conversaId));
  }

  async contarConversas(estudanteId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(conversaSocratica)
      .where(eq(conversaSocratica.estudanteId, estudanteId));
    return Number(row?.value ?? 0);
  }

  async listarConversas(estudanteId: string): Promise<{ id: string; temaAtivo: string | null; criadoEm: string }[]> {
    const rows = await this.db
      .select({
        id: conversaSocratica.id,
        temaAtivo: conversaSocratica.temaAtivo,
        criadoEm: conversaSocratica.criadoEm,
      })
      .from(conversaSocratica)
      .where(eq(conversaSocratica.estudanteId, estudanteId))
      .orderBy(desc(conversaSocratica.criadoEm)); // Mais recentes primeiro

    return rows.map((r) => ({
      ...r,
      criadoEm: r.criadoEm.toISOString(),
    }));
  }

  async manterLimiteSocratico(estudanteId: string, limite: number): Promise<void> {
    // Busca todas as conversas do estudante ordenadas da MAIS VELHA para a mais nova (ASC)
    const rows = await this.db
      .select({ id: conversaSocratica.id })
      .from(conversaSocratica)
      .where(eq(conversaSocratica.estudanteId, estudanteId))
      .orderBy(asc(conversaSocratica.criadoEm));
    
    if (rows.length >= limite) {
      // Excluir as mais antigas até que sobre apenas `limite - 1` para dar espaço à nova
      const quantidadeDeletar = rows.length - limite + 1;
      const idsParaDeletar = rows.slice(0, quantidadeDeletar).map((r) => r.id);
      
      if (idsParaDeletar.length > 0) {
        // A foreign key para mensagem_socratica está configurada com onDelete: cascade.
        await this.db.delete(conversaSocratica).where(inArray(conversaSocratica.id, idsParaDeletar));
      }
    }
  }

  /** Garante o `usuario` mock em dev antes de gravar conversa (FK estudante_id). */
  private async garantirUsuarioMockDev(estudanteId: string): Promise<void> {
    if (isDevBypassEnabled() && estudanteId === MOCK_DEV_USER_ID) {
      await this.db
        .insert(usuario)
        .values({
          id: MOCK_DEV_USER_ID,
          authUid: MOCK_DEV_USER_ID,
          nome: MOCK_DEV_USER_NOME,
          email: MOCK_DEV_USER_EMAIL,
          tipoPerfil: 'estudante',
          status: 'ativo',
        })
        .onConflictDoNothing();
    }
  }
}
