import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { usuario } from './identidade';
import { adaptacaoOrigemEnum } from './enums';

// doc 04 §3 — Perfil e personalização (núcleo da inclusão)

export const perfilOnboarding = pgTable('perfil_onboarding', {
  id: uuid('id').primaryKey().defaultRandom(),
  estudanteId: uuid('estudante_id')
    .notNull()
    .unique()
    .references(() => usuario.id, { onDelete: 'restrict' }),
  objetivoEnem: text('objetivo_enem'),
  estiloAprendizagemAutodeclarado: jsonb('estilo_aprendizagem_autodeclarado'),
  dificuldades: jsonb('dificuldades'),
  rotinaEstudo: jsonb('rotina_estudo'),
  autopercepcao: jsonb('autopercepcao'),
  passoAtual: integer('passo_atual').notNull().default(1), // salvamento incremental (A6)
  concluidoEm: timestamp('concluido_em', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
});

// NEW — R5/I10: isolada do PerfilOnboarding, acesso mais restrito (RLS estrita, doc 10).
export const dadoSensivelEstudante = pgTable('dado_sensivel_estudante', {
  estudanteId: uuid('estudante_id')
    .primaryKey()
    .references(() => usuario.id, { onDelete: 'restrict' }),
  neurodivergencia: jsonb('neurodivergencia'), // opcional — ex.: {tdah:true, dislexia:false}
  consentimentoBaseLegal: text('consentimento_base_legal'),
  consentidoPor: uuid('consentido_por'), // responsável ou o próprio aluno
  consentidoEm: timestamp('consentido_em', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const perfilCognitivo4d = pgTable(
  'perfil_cognitivo_4d',
  {
    estudanteId: uuid('estudante_id')
      .primaryKey()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    eixoVisualVerbal: numeric('eixo_visual_verbal', { precision: 4, scale: 3 })
      .notNull()
      .default('0'),
    eixoAnaliticoHolistico: numeric('eixo_analitico_holistico', { precision: 4, scale: 3 })
      .notNull()
      .default('0'),
    eixoSequencialAleatorio: numeric('eixo_sequencial_aleatorio', { precision: 4, scale: 3 })
      .notNull()
      .default('0'),
    eixoReflexivoImpulsivo: numeric('eixo_reflexivo_impulsivo', { precision: 4, scale: 3 })
      .notNull()
      .default('0'),
    confianca: numeric('confianca', { precision: 4, scale: 3 }).notNull().default('0'),
    recomendacoesAtivas: jsonb('recomendacoes_ativas').notNull().default([]),
    xpTotal: integer('xp_total').notNull().default(0),
    nivelAtual: integer('nivel_atual').notNull().default(1),
    ofensivaDias: integer('ofensiva_dias').notNull().default(0),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('ck_perfil4d_visual_verbal', sql`${t.eixoVisualVerbal} between -1 and 1`),
    check('ck_perfil4d_analitico_holistico', sql`${t.eixoAnaliticoHolistico} between -1 and 1`),
    check('ck_perfil4d_sequencial_aleatorio', sql`${t.eixoSequencialAleatorio} between -1 and 1`),
    check('ck_perfil4d_reflexivo_impulsivo', sql`${t.eixoReflexivoImpulsivo} between -1 and 1`),
    check('ck_perfil4d_confianca', sql`${t.confianca} between 0 and 1`),
    check('ck_perfil4d_xp_total', sql`${t.xpTotal} >= 0`),
    check('ck_perfil4d_nivel_atual', sql`${t.nivelAtual} >= 1`),
    check('ck_perfil4d_ofensiva_dias', sql`${t.ofensivaDias} >= 0`),
  ],
);

// Append-only — histórico do perfil 4D (doc 04 §9).
export const perfilCognitivoEvento = pgTable(
  'perfil_cognitivo_evento',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    snapshot: jsonb('snapshot').notNull(), // 4 eixos + confiança no momento
    motivo: text('motivo'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_perfil_cognitivo_evento_estudante_criado').on(t.estudanteId, t.criadoEm)],
);

export const adaptacaoAtiva = pgTable(
  'adaptacao_ativa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    tipo: text('tipo').notNull(), // ex.: ritmo_questao, formato_explicacao
    parametros: jsonb('parametros').notNull().default({}),
    origem: adaptacaoOrigemEnum('origem').notNull(),
    ativa: boolean('ativa').notNull().default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_adaptacao_ativa_estudante_ativa').on(t.estudanteId, t.ativa)],
);
