import { index, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { usuario } from './identidade';
import { bancoDeItens } from './tri';
import { erroClassificacaoEnum } from './enums';

// doc 04 §5 — Detecção de padrão de erro

export const ocorrenciaErro = pgTable(
  'ocorrencia_erro',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    itemId: uuid('item_id').references(() => bancoDeItens.id, { onDelete: 'restrict' }),
    competencia: text('competencia'),
    classificacao: erroClassificacaoEnum('classificacao').notNull(),
    evidencias: jsonb('evidencias').notNull(), // tempo, histórico recente, mudança de padrão
    confianca: numeric('confianca').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_ocorrencia_erro_estudante_criado').on(t.estudanteId, t.criadoEm)],
);
