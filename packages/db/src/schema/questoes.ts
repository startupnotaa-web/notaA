import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { areaConhecimentoEnum } from './enums';

export const dificuldadeTriEnum = pgEnum('dificuldade_tri', ['facil', 'media', 'dificil']);

// Língua estrangeira da prova do ENEM (itens 1–5 de Linguagens, Dia 1): o aluno
// responde a UMA das duas versões.
export const idiomaEstrangeiroEnum = pgEnum('idioma_estrangeiro', ['ingles', 'espanhol']);

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
  imagemUrl: text('imagem_url'),
  // NULL = questão comum. Preenchido só nos itens de língua estrangeira: o
  // simulado serve cada versão apenas a quem escolheu aquele idioma.
  idioma: idiomaEstrangeiroEnum('idioma'),
});

// Exceções transitórias ao banco: questão que NÃO pode ser servida ao aluno.
// Tabela lateral de propósito — não altera `questoes_enem` e sai de cena quando
// o estado de revisão (rascunho/em revisão/aprovada/reprovada/arquivada) entrar
// no modelo. Toda linha aqui bloqueia a questão, qualquer que seja a situação.
// RLS ligada e sem policy: só a API (service role) lê e escreve.
export const questaoSuspensa = pgTable(
  'questao_suspensa',
  {
    questaoId: uuid('questao_id')
      .primaryKey()
      .references(() => questoesEnem.id, { onDelete: 'cascade' }),
    situacao: text('situacao').notNull().default('suspensa'),
    motivos: text('motivos').array().notNull(),
    origem: text('origem').notNull().default('manual'),
    criadaEm: timestamp('criada_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('ck_questao_suspensa_situacao', sql`${t.situacao} in ('suspensa', 'anulada', 'arquivada')`),
  ],
);
