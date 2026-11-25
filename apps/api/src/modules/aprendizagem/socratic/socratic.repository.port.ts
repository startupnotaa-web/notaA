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
