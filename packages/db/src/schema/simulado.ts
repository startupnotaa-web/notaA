import { boolean, index, integer, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { areaConhecimentoEnum } from './enums';
import { dificuldadeTriEnum } from './questoes';
import { bancoDeItens, sessaoAvaliativa } from './tri';

// Simulado multi-área (doc 08 E6) — diferente do Quiz, que é de área única e
// 100% gerado por IA. Aqui o aluno faz um bloco fechado de questões, sem
// feedback por questão: acerto/erro só são revelados no relatório final.

export const simuladoModoEnum = pgEnum('simulado_modo', ['cronometrado', 'livre']);

/** Procedência da questão — o relatório mostra quantas foram reais do ENEM. */
export const simuladoOrigemEnum = pgEnum('simulado_origem', ['enem', 'ia']);

/**
 * Cabeçalho do simulado. 1:1 com `sessao_avaliativa` (tipo='simulado',
 * area_conhecimento NULL) — reusa sessão/tentativas em vez de duplicar, e por
 * isso as respostas continuam caindo em `tentativa_resposta`.
 */
export const simuladoSessao = pgTable(
  'simulado_sessao',
  {
    // Mesma PK da sessão avaliativa: o simulado É uma sessão, com campos extras.
    sessaoId: uuid('sessao_id')
      .primaryKey()
      .references(() => sessaoAvaliativa.id, { onDelete: 'cascade' }),
    modo: simuladoModoEnum('modo').notNull(),
    /** NULL no modo livre; 60 ou 90 no cronometrado. */
    limiteMinutos: integer('limite_minutos'),
    /** Prazo absoluto, calculado no servidor — o cliente não é fonte de verdade. */
    expiraEm: timestamp('expira_em', { withTimezone: true }),
    totalQuestoes: integer('total_questoes').notNull(),
    /** Preenchidos só no finish. */
    acertos: integer('acertos'),
    xpConcedido: integer('xp_concedido'),
    /** Estourou o prazo — as não respondidas contam como erro. */
    expirado: boolean('expirado').default(false).notNull(),
    finalizadoEm: timestamp('finalizado_em', { withTimezone: true }),
  },
  (t) => [index('idx_simulado_sessao_expira').on(t.expiraEm)],
);

/**
 * As questões sorteadas para a prova, congeladas na criação. Guardar a lista é
 * o que permite (a) ordem estável entre recarregamentos e (b) o relatório por
 * área/dificuldade sem depender de dados que vivem em outra tabela.
 */
export const simuladoQuestao = pgTable(
  'simulado_questao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessaoId: uuid('sessao_id')
      .notNull()
      .references(() => simuladoSessao.sessaoId, { onDelete: 'cascade' }),
    /** FK obrigatória: `tentativa_resposta.item_id` aponta para cá. */
    itemId: uuid('item_id')
      .notNull()
      .references(() => bancoDeItens.id, { onDelete: 'restrict' }),
    ordem: integer('ordem').notNull(),
    area: areaConhecimentoEnum('area').notNull(),
    dificuldade: dificuldadeTriEnum('dificuldade').notNull(),
    /** 'enem' = questão real do banco público; 'ia' = gerada para completar a prova. */
    origem: simuladoOrigemEnum('origem').notNull(),
  },
  (t) => [
    index('idx_simulado_questao_sessao_ordem').on(t.sessaoId, t.ordem),
    index('idx_simulado_questao_item').on(t.itemId),
  ],
);
