import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { usuario } from './identidade';
import { areaConhecimentoEnum, sessaoStatusEnum, sessaoTipoEnum } from './enums';

// doc 04 §4 — Motor TRI e avaliação adaptativa

export const bancoDeItens = pgTable(
  'banco_de_itens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    areaConhecimento: areaConhecimentoEnum('area_conhecimento').notNull(),
    competencia: text('competencia').notNull(),
    paramA: numeric('param_a').notNull(), // discriminação
    paramB: numeric('param_b').notNull(), // dificuldade
    paramC: numeric('param_c').notNull(), // acerto casual
    enunciado: text('enunciado').notNull(),
    alternativas: jsonb('alternativas').notNull(),
    gabarito: text('gabarito').notNull(),
    metadadosUso: jsonb('metadados_uso').notNull().default({}),
    // Marcador de calibração (R3/I11) — nunca tratar parâmetros como oficiais sem validação.
    naoCalibrado: boolean('nao_calibrado').notNull().default(true),
    versaoCalibracao: text('versao_calibracao'),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_banco_itens_area_competencia').on(t.areaConhecimento, t.competencia),
    index('idx_banco_itens_ativo')
      .on(t.ativo)
      .where(sql`${t.ativo} = true`),
    check('ck_banco_itens_param_c', sql`${t.paramC} between 0 and 1`),
  ],
);

export const habilidadeEstudante = pgTable(
  'habilidade_estudante',
  {
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    areaConhecimento: areaConhecimentoEnum('area_conhecimento').notNull(),
    theta: numeric('theta').notNull().default('0'),
    erroPadrao: numeric('erro_padrao').notNull().default('1'),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.estudanteId, t.areaConhecimento] })],
);

// Append-only — histórico de theta (doc 04 §9).
export const tentativaResposta = pgTable(
  'tentativa_resposta',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => bancoDeItens.id, { onDelete: 'restrict' }),
    sessaoId: uuid('sessao_id')
      .notNull()
      .references(() => sessaoAvaliativa.id, { onDelete: 'restrict' }),
    resposta: text('resposta').notNull(),
    acerto: boolean('acerto').notNull(),
    tempoRespostaMs: integer('tempo_resposta_ms').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_tentativa_idempotency_key').on(t.idempotencyKey),
    index('idx_tentativa_estudante_criado').on(t.estudanteId, t.criadoEm),
    index('idx_tentativa_sessao').on(t.sessaoId),
    index('idx_tentativa_item').on(t.itemId),
  ],
);

export const thetaEvento = pgTable(
  'theta_evento',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    areaConhecimento: areaConhecimentoEnum('area_conhecimento').notNull(),
    theta: numeric('theta').notNull(),
    erroPadrao: numeric('erro_padrao').notNull(),
    tentativaId: uuid('tentativa_id').references(() => tentativaResposta.id, {
      onDelete: 'restrict',
    }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_theta_evento_estudante_area_criado').on(
      t.estudanteId,
      t.areaConhecimento,
      t.criadoEm,
    ),
  ],
);

export const sessaoAvaliativa = pgTable(
  'sessao_avaliativa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    tipo: sessaoTipoEnum('tipo').notNull(),
    // NEW (Fase 1, E2): área única da sessão quando tipo='quiz' (Motor TRI
    // seleciona dentro de UMA área por sessão — doc 05 §4). NULL para
    // tipo='simulado' (multi-área, doc 08 E6) ou 'duelo'.
    areaConhecimento: areaConhecimentoEnum('area_conhecimento'),
    iniciadoEm: timestamp('iniciado_em', { withTimezone: true }).notNull().defaultNow(),
    finalizadoEm: timestamp('finalizado_em', { withTimezone: true }),
    status: sessaoStatusEnum('status').notNull().default('em_andamento'),
  },
  (t) => [index('idx_sessao_avaliativa_estudante_iniciado').on(t.estudanteId, t.iniciadoEm)],
);
