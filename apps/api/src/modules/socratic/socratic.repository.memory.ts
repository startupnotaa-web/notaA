import { randomUUID } from 'node:crypto';

/**
 * Porta de repositório para o módulo Socrático (doc 04 §6).
 * Espelha as tabelas `conversa_socratica` e `mensagem_socratica`.
 */
export interface SocraticRepositoryPort {
  criarConversa(input: {
    estudanteId: string;
    temaAtivo?: string;
    sessaoId?: string;
  }): Promise<{ conversaId: string }>;

  buscarConversa(conversaId: string): Promise<{
    id: string;
    estudanteId: string;
    temaAtivo: string | null;
    resumoContexto: string | null;
  } | null>;

  adicionarMensagem(input: {
    conversaId: string;
    papel: 'estudante' | 'tutor' | 'sistema';
    conteudo: string;
    estadoMaquina?: string;
  }): Promise<{ mensagemId: string }>;

  listarMensagens(
    conversaId: string,
  ): Promise<{ id: string; papel: string; conteudo: string; criadoEm: string }[]>;

  atualizarResumoContexto(conversaId: string, resumo: string): Promise<void>;

  contarConversas(estudanteId: string): Promise<number>;
  listarConversas(estudanteId: string): Promise<{ id: string; temaAtivo: string | null; criadoEm: string }[]>;
  manterLimiteSocratico(estudanteId: string, limite: number): Promise<void>;
}
/**
 * Implementação in-memory de SocraticRepositoryPort — usada até o projeto
 * Supabase estar provisionado. Único ponto de troca (ai.module.ts).
 */
export class SocraticRepositoryMemory implements SocraticRepositoryPort {
  private conversas = new Map<
    string,
    { id: string; estudanteId: string; temaAtivo: string | null; resumoContexto: string | null }
  >();
  private mensagens = new Map<
    string,
    { id: string; conversaId: string; papel: string; conteudo: string; criadoEm: string; estadoMaquina?: string }[]
  >();

  async criarConversa(input: {
    estudanteId: string;
    temaAtivo?: string;
    sessaoId?: string;
  }): Promise<{ conversaId: string }> {
    const id = randomUUID();
    this.conversas.set(id, {
      id,
      estudanteId: input.estudanteId,
      temaAtivo: input.temaAtivo ?? null,
      resumoContexto: null,
    });
    this.mensagens.set(id, []);
    return { conversaId: id };
  }

  async buscarConversa(conversaId: string) {
    return this.conversas.get(conversaId) ?? null;
  }

  async adicionarMensagem(input: {
    conversaId: string;
    papel: 'estudante' | 'tutor' | 'sistema';
    conteudo: string;
    estadoMaquina?: string;
  }): Promise<{ mensagemId: string }> {
    const id = randomUUID();
    const lista = this.mensagens.get(input.conversaId) ?? [];
    lista.push({
      id,
      conversaId: input.conversaId,
      papel: input.papel,
      conteudo: input.conteudo,
      criadoEm: new Date().toISOString(),
      estadoMaquina: input.estadoMaquina,
    });
    this.mensagens.set(input.conversaId, lista);
    return { mensagemId: id };
  }

  async listarMensagens(conversaId: string) {
    const lista = this.mensagens.get(conversaId) ?? [];
    return lista.map((m) => ({
      id: m.id,
      papel: m.papel,
      conteudo: m.conteudo,
      criadoEm: m.criadoEm,
    }));
  }

  async atualizarResumoContexto(conversaId: string, resumo: string): Promise<void> {
    const conversa = this.conversas.get(conversaId);
    if (conversa) {
      conversa.resumoContexto = resumo;
    }
  }

  async contarConversas(estudanteId: string): Promise<number> {
    return Array.from(this.conversas.values()).filter((c) => c.estudanteId === estudanteId).length;
  }

  async listarConversas(estudanteId: string): Promise<{ id: string; temaAtivo: string | null; criadoEm: string }[]> {
    const conversasFiltradas = Array.from(this.conversas.values()).filter((c) => c.estudanteId === estudanteId);
    return conversasFiltradas.map((c) => ({
      id: c.id,
      temaAtivo: c.temaAtivo,
      criadoEm: new Date().toISOString(), // In memory doesn't store date by default, mocking it
    }));
  }

  async manterLimiteSocratico(estudanteId: string, limite: number): Promise<void> {
    const conversasFiltradas = Array.from(this.conversas.values()).filter((c) => c.estudanteId === estudanteId);
    if (conversasFiltradas.length >= limite) {
      // Deleta as mais antigas (primeiras inseridas)
      const paraDeletar = conversasFiltradas.length - limite + 1;
      for (let i = 0; i < paraDeletar; i++) {
        const velha = conversasFiltradas[i];
        if (velha) {
          this.conversas.delete(velha.id);
          this.mensagens.delete(velha.id);
        }
      }
    }
  }
}
