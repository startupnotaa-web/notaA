import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { areaConhecimentoEnum } from './enums';

export const dificuldadeTriEnum = pgEnum('dificuldade_tri', ['facil', 'media', 'dificil']);

export const questoesEnem = pgTable('questoes_enem', {
  id: uuid('id').primaryKey().defaultRandom(),
  area: areaConhecimentoEnum('area').notNull(),
  ano: integer('ano').notNull(),
  textoBase: text('texto_base'),
  enunciado: text('enunciado').notNull(),
  // Array de strings representando as opções [A, B, C, D, E]
  alternativas: jsonb('alternativas').notNull(),
  correta: integer('correta').notNull(), // índice 0 a 4
  habilidadeBncc: varchar('habilidade_bncc', { length: 255 }),
  dificuldadeTri: dificuldadeTriEnum('dificuldade_tri').notNull(),
});
