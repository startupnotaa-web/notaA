import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { usuario } from './identidade';
import { duelStatusEnum, duelTipoEnum, rankingEscopoEnum, xpOrigemEnum } from './enums';

// doc 04 §7 — Gamificação

// Append-only (I7) — sem UPDATE/DELETE; saldo via SUM(valor) ou view materializada.
export const xpLedger = pgTable(
  'xp_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    origem: xpOrigemEnum('origem').notNull(),
    referenciaId: uuid('referencia_id'),
    valor: integer('valor').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_xp_ledger_estudante_criado').on(t.estudanteId, t.criadoEm),
    check('ck_xp_ledger_valor_nao_zero', sql`${t.valor} <> 0`),
  ],
);

export const streak = pgTable('streak', {
  estudanteId: uuid('estudante_id')
    .primaryKey()
    .references(() => usuario.id, { onDelete: 'restrict' }),
  diasConsecutivos: integer('dias_consecutivos').notNull().default(0),
  ultimaAtividadeValida: date('ultima_atividade_valida'),
  freezesDisponiveis: integer('freezes_disponiveis').notNull().default(0), // tolerância (gamificação inclusiva)
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const conquista = pgTable(
  'conquista',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: text('codigo').notNull(),
    criterio: jsonb('criterio').notNull(),
    xpAssociado: integer('xp_associado').notNull().default(0),
    ativo: boolean('ativo').notNull().default(true),
  },
  (t) => [unique('uq_conquista_codigo').on(t.codigo)],
);

export const conquistaConcedida = pgTable(
  'conquista_concedida',
  {
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    conquistaId: uuid('conquista_id')
      .notNull()
      .references(() => conquista.id, { onDelete: 'restrict' }),
    concedidoEm: timestamp('concedido_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.estudanteId, t.conquistaId] })], // idempotente — não concede 2×
);

// Pós-MVP (E14/E15 — Fase 5), modelado desde já por completude do esquema.
export const duelo = pgTable('duelo', {
  id: uuid('id').primaryKey().defaultRandom(),
  tipo: duelTipoEnum('tipo').notNull(),
  status: duelStatusEnum('status').notNull().default('aguardando'),
  placar: jsonb('placar').notNull().default({}),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const duelParticipante = pgTable(
  'duelo_participante',
  {
    duelId: uuid('duelo_id')
      .notNull()
      .references(() => duelo.id, { onDelete: 'cascade' }),
    participanteId: uuid('participante_id').notNull(), // usuario.id ou turma.id
    pontos: integer('pontos').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.duelId, t.participanteId] })],
);

// Calculado (I8) — nunca fonte de verdade; materializa XP/theta agregados.
export const rankingSnapshot = pgTable(
  'ranking_snapshot',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escopo: rankingEscopoEnum('escopo').notNull(),
    escopoId: uuid('escopo_id').notNull(),
    periodo: text('periodo').notNull(),
    posicoes: jsonb('posicoes').notNull(),
    geradoEm: timestamp('gerado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_ranking_snapshot_escopo_periodo').on(t.escopo, t.escopoId, t.periodo)],
);
