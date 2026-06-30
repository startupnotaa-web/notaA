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
import { escola, usuario } from './identidade';
import { assinaturaStatusEnum, iaIntegracaoEnum, planoTipoEnum } from './enums';

// doc 04 §8 — Comercial e governança de uso de IA

export const plano = pgTable(
  'plano',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipo: planoTipoEnum('tipo').notNull(),
    limitesIa: jsonb('limites_ia').notNull().default({}), // ex.: {socratica_dia: N, redacoes_mes: M}
    recursos: jsonb('recursos').notNull().default({}),
    ativo: boolean('ativo').notNull().default(true),
  },
  (t) => [unique('uq_plano_tipo').on(t.tipo)],
);

export const assinatura = pgTable(
  'assinatura',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id').references(() => usuario.id, { onDelete: 'restrict' }),
    escolaId: uuid('escola_id').references(() => escola.id, { onDelete: 'restrict' }),
    planoId: uuid('plano_id')
      .notNull()
      .references(() => plano.id, { onDelete: 'restrict' }),
    status: assinaturaStatusEnum('status').notNull().default('ativa'),
    vigenciaInicio: timestamp('vigencia_inicio', { withTimezone: true }).notNull().defaultNow(),
    vigenciaFim: timestamp('vigencia_fim', { withTimezone: true }),
  },
  (t) => [
    index('idx_assinatura_usuario').on(t.usuarioId),
    index('idx_assinatura_escola').on(t.escolaId),
    check(
      'ck_assinatura_titular_unico',
      sql`(${t.usuarioId} is not null and ${t.escolaId} is null) or (${t.usuarioId} is null and ${t.escolaId} is not null)`,
    ),
  ],
);

// NEW — R6; fonte 3.4. Conteúdo também vive em packages/prompts versionado em git;
// esta tabela referencia a versão ATIVA em produção.
export const promptVersionado = pgTable(
  'prompt_versionado',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    integracao: iaIntegracaoEnum('integracao').notNull(),
    versao: text('versao').notNull(),
    conteudo: text('conteudo').notNull(),
    ativo: boolean('ativo').notNull().default(false),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('uq_prompt_versionado_integracao_versao').on(t.integracao, t.versao)],
);

export const logUsoIa = pgTable(
  'log_uso_ia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    integracao: iaIntegracaoEnum('integracao').notNull(),
    promptVersaoId: uuid('prompt_versao_id').references(() => promptVersionado.id, {
      onDelete: 'restrict',
    }),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    custoEstimado: numeric('custo_estimado'),
    sucesso: boolean('sucesso').notNull(),
    latenciaMs: integer('latencia_ms'),
    correlationId: text('correlation_id'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_log_uso_ia_usuario_criado').on(t.usuarioId, t.criadoEm),
    index('idx_log_uso_ia_integracao_criado').on(t.integracao, t.criadoEm),
  ],
);

export const contadorRateLimit = pgTable(
  'contador_rate_limit',
  {
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    integracao: iaIntegracaoEnum('integracao').notNull(),
    janelaInicio: timestamp('janela_inicio', { withTimezone: true }).notNull(),
    contagem: integer('contagem').notNull().default(0),
    limite: integer('limite').notNull(),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.integracao, t.janelaInicio] })],
);

export const logAuditoriaAdmin = pgTable(
  'log_auditoria_admin',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    acao: text('acao').notNull(),
    entidade: text('entidade').notNull(),
    entidadeId: uuid('entidade_id'),
    diff: jsonb('diff'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_log_auditoria_admin_criado').on(t.adminId, t.criadoEm),
    index('idx_log_auditoria_entidade').on(t.entidade, t.entidadeId),
  ],
);
