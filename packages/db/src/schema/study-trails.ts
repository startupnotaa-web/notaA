import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { usuario } from './identidade';

export const trilhaEstudo = pgTable('trilha_estudo', {
  id: uuid('id').primaryKey().defaultRandom(),
  estudanteId: uuid('estudante_id')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  titulo: text('titulo').notNull(),
  descricao: text('descricao').notNull(),
  passos: jsonb('passos').notNull().default([]), // array of objects { titulo, descricao, dica }
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});
