import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { citext } from './common';
import { statusUsuarioEnum, tipoPerfilEnum, vinculoStatusEnum } from './enums';

// doc 04 §2 — Identidade e acesso

export const escola = pgTable('escola', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  rede: text('rede'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const usuario = pgTable(
  'usuario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipoPerfil: tipoPerfilEnum('tipo_perfil').notNull(),
    nome: text('nome'),
    email: citext('email').notNull(),
    authUid: uuid('auth_uid').unique(), // id do Supabase Auth — credenciais NÃO ficam aqui
    status: statusUsuarioEnum('status').notNull().default('pendente'),
    escolaId: uuid('escola_id').references(() => escola.id, { onDelete: 'restrict' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_usuario_email').on(t.email),
    index('idx_usuario_escola').on(t.escolaId),
    index('idx_usuario_tipo_perfil').on(t.tipoPerfil),
  ],
);

export const turma = pgTable(
  'turma',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escolaId: uuid('escola_id')
      .notNull()
      .references(() => escola.id, { onDelete: 'restrict' }),
    professorId: uuid('professor_id').references(() => usuario.id, { onDelete: 'restrict' }),
    nome: text('nome').notNull(),
    periodo: text('periodo'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('uq_turma_escola_nome_periodo').on(t.escolaId, t.nome, t.periodo)],
);

export const matriculaTurma = pgTable(
  'matricula_turma',
  {
    turmaId: uuid('turma_id')
      .notNull()
      .references(() => turma.id, { onDelete: 'restrict' }),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.turmaId, t.estudanteId] })],
  // CK "estudante tem tipo_perfil='estudante'" — validado em app + trigger (doc 04 §2), não expressável como CHECK simples (depende de outra tabela).
);

export const vinculoResponsavel = pgTable(
  'vinculo_responsavel',
  {
    responsavelId: uuid('responsavel_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    permissoes: jsonb('permissoes').notNull().default({}),
    status: vinculoStatusEnum('status').notNull().default('pendente'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.responsavelId, t.estudanteId] })],
);
