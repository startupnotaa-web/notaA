import { pgEnum } from 'drizzle-orm/pg-core';

// Todos os enums concretos do docs/04-modelo-de-dados.md, como tipos Postgres
// (convenção §0). Nomes em snake_case, valores espelhando o doc exatamente.

// Professor institucional e independente são papéis DISTINTOS (perfis.md): uma
// conta é um papel só, e quem leciona numa instituição e também quer turmas
// próprias precisa de duas contas. 'admin' é o administrador da PLATAFORMA, não
// o da instituição.
export const tipoPerfilEnum = pgEnum('tipo_perfil', [
  'estudante',
  'professor_institucional',
  'professor_independente',
  'admin_instituicao',
  'responsavel',
  'admin',
]);

export const statusUsuarioEnum = pgEnum('status_usuario', ['ativo', 'suspenso', 'pendente']);

export const vinculoStatusEnum = pgEnum('vinculo_status', ['pendente', 'ativo', 'revogado']);

// Estado da solicitação de entrada do aluno numa turma (perfis.md). Não reusa
// `vinculo_status` porque aqui existe 'recusada', que o fluxo do responsável não
// tem, e porque 'removida' (tirada pela turma) é diferente de recusada (nunca
// entrou) — a distinção importa para o histórico.
export const matriculaStatusEnum = pgEnum('matricula_status', [
  'pendente',
  'ativa',
  'recusada',
  'removida',
]);

export const adaptacaoOrigemEnum = pgEnum('adaptacao_origem', ['manual', 'inferida']);

export const areaConhecimentoEnum = pgEnum('area_conhecimento', [
  'linguagens',
  'humanas',
  'natureza',
  'matematica',
  'redacao',
  'fin',
  'soc',
  'art',
]);

export const sessaoTipoEnum = pgEnum('sessao_tipo', ['quiz', 'simulado', 'duelo']);

export const sessaoStatusEnum = pgEnum('sessao_status', [
  'em_andamento',
  'concluida',
  'abandonada',
]);

export const erroClassificacaoEnum = pgEnum('erro_classificacao', [
  'lacuna_conhecimento',
  'deslize_atencao',
]);

export const redacaoStatusEnum = pgEnum('redacao_status', [
  'em_correcao',
  'corrigida',
  'falha',
  'bloqueada_protocolo',
]);

export const mensagemPapelEnum = pgEnum('mensagem_papel', ['estudante', 'tutor', 'sistema']);

export const riscoOrigemEnum = pgEnum('risco_origem', ['socratica', 'redacao']);

export const riscoSeveridadeEnum = pgEnum('risco_severidade', ['baixa', 'media', 'alta']);

export const riscoStatusAcompanhamentoEnum = pgEnum('risco_status_acompanhamento', [
  'aberto',
  'em_acompanhamento',
  'encerrado',
]);

export const xpOrigemEnum = pgEnum('xp_origem', [
  'quiz',
  'simulado',
  'redacao',
  'streak',
  'conquista',
  'duelo',
  'reflexao_erro',
]);

export const duelTipoEnum = pgEnum('duelo_tipo', ['1v1', 'coletiva_turma']);

export const duelStatusEnum = pgEnum('duelo_status', ['aguardando', 'em_andamento', 'encerrado']);

// NÃO renomeado: o valor 'escola' deste enum pertence à Arena, que está
// oculta (feature-flags). Trocá-lo custaria uma migração em produção para
// um recurso fora do ar. Renomear quando a Arena voltar.
export const rankingEscopoEnum = pgEnum('ranking_escopo', ['turma', 'escola']);

export const planoTipoEnum = pgEnum('plano_tipo', ['free', 'plus', 'instituicao']);

export const assinaturaStatusEnum = pgEnum('assinatura_status', [
  'ativa',
  'inadimplente',
  'cancelada',
]);

export const iaIntegracaoEnum = pgEnum('ia_integracao', ['socratica', 'redacao', 'quiz', 'batalha', 'trilha']);
