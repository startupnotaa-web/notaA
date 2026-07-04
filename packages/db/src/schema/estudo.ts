import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { usuario } from './identidade';
import { sessaoAvaliativa } from './tri';
import {
  mensagemPapelEnum,
  redacaoStatusEnum,
  riscoOrigemEnum,
  riscoSeveridadeEnum,
  riscoStatusAcompanhamentoEnum,
} from './enums';

// doc 04 §6 — Estudo aprofundado

export const temaRedacao = pgTable('tema_redacao', {
  id: uuid('id').primaryKey().defaultRandom(),
  titulo: text('titulo').notNull(),
  textoMotivador: text('texto_motivador'),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const redacao = pgTable(
  'redacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    temaId: uuid('tema_id').references(() => temaRedacao.id, { onDelete: 'restrict' }),
    temaLivre: text('tema_livre'),
    texto: text('texto').notNull(),
    status: redacaoStatusEnum('status').notNull().default('em_correcao'),
    enviadoEm: timestamp('enviado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_redacao_estudante_enviado').on(t.estudanteId, t.enviadoEm)],
);

// NEW — R6/Q-03: versionada, calibrável (nunca valores oficiais hard-coded).
export const rubricaRedacao = pgTable(
  'rubrica_redacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    versao: text('versao').notNull(),
    definicao: jsonb('definicao').notNull(), // descrição das 5 competências e níveis
    naoCalibrado: boolean('nao_calibrado').notNull().default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('uq_rubrica_redacao_versao').on(t.versao)],
);

export const avaliacaoRedacao = pgTable(
  'avaliacao_redacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    redacaoId: uuid('redacao_id')
      .notNull()
      .unique()
      .references(() => redacao.id, { onDelete: 'restrict' }),
    notaTotal: integer('nota_total').notNull(),
    feedbackGeral: jsonb('feedback_geral').notNull(), // pontosFortes, pontosMelhoria, proximoPasso
    rubricaId: uuid('rubrica_id')
      .notNull()
      .references(() => rubricaRedacao.id, { onDelete: 'restrict' }),
    motorVersao: text('motor_versao').notNull(),
    modeloVersao: text('modelo_versao').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('ck_avaliacao_redacao_nota_total', sql`${t.notaTotal} between 0 and 1000`)],
);

export const avaliacaoCompetencia = pgTable(
  'avaliacao_competencia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    avaliacaoId: uuid('avaliacao_id')
      .notNull()
      .references(() => avaliacaoRedacao.id, { onDelete: 'cascade' }),
    competencia: integer('competencia').notNull(),
    nota: integer('nota').notNull(),
    justificativa: text('justificativa').notNull(),
    citacoes: jsonb('citacoes').notNull().default([]), // [{trecho, inicio, fim, comentario}]
  },
  (t) => [
    unique('uq_avaliacao_competencia').on(t.avaliacaoId, t.competencia),
    check('ck_avaliacao_competencia_numero', sql`${t.competencia} between 1 and 5`),
    check('ck_avaliacao_competencia_nota', sql`${t.nota} between 0 and 200`),
  ],
);

export const conversaSocratica = pgTable(
  'conversa_socratica',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    sessaoId: uuid('sessao_id').references(() => sessaoAvaliativa.id, { onDelete: 'restrict' }),
    temaAtivo: text('tema_ativo'),
    resumoContexto: text('resumo_contexto'), // não histórico bruto ilimitado (I9)
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_conversa_socratica_estudante').on(t.estudanteId)],
);

export const mensagemSocratica = pgTable(
  'mensagem_socratica',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversaId: uuid('conversa_id')
      .notNull()
      .references(() => conversaSocratica.id, { onDelete: 'cascade' }),
    papel: mensagemPapelEnum('papel').notNull(),
    conteudo: text('conteudo').notNull(),
    estadoMaquina: text('estado_maquina'), // nó da máquina de estados (doc 06)
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_mensagem_socratica_conversa_criado').on(t.conversaId, t.criadoEm)],
);

// NEW — R4/I6: sustenta o protocolo de cuidado humano. Acesso restrito (doc 10).
export const ocorrenciaRisco = pgTable(
  'ocorrencia_risco',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    origem: riscoOrigemEnum('origem').notNull(),
    referenciaId: uuid('referencia_id').notNull(), // conversa_socratica.id ou redacao.id
    sinal: text('sinal').notNull(),
    severidade: riscoSeveridadeEnum('severidade').notNull(),
    acaoTomada: jsonb('acao_tomada').notNull().default({}),
    statusAcompanhamento: riscoStatusAcompanhamentoEnum('status_acompanhamento')
      .notNull()
      .default('aberto'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_ocorrencia_risco_status_criado').on(t.statusAcompanhamento, t.criadoEm)],
);

// Auditoria R8 / decisão Q-01 (doc 10 §6): registro de cada notificação do
// protocolo de cuidado a responsável/escola vinculados. `status='pendente'`
// até um canal de entrega real (e-mail/push) confirmar o envio — o Portal
// Responsável/Escola lê daqui as notificações in-app.
export const notificacaoCuidado = pgTable(
  'notificacao_cuidado',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ocorrenciaId: uuid('ocorrencia_id')
      .notNull()
      .references(() => ocorrenciaRisco.id, { onDelete: 'restrict' }),
    destinatarioId: uuid('destinatario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    papelDestinatario: text('papel_destinatario').notNull(), // 'responsavel' | 'gestor'
    canal: text('canal').notNull().default('in_app'),
    status: text('status').notNull().default('pendente'), // pendente | enviada | falha
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    enviadoEm: timestamp('enviado_em', { withTimezone: true }),
  },
  (t) => [
    index('idx_notificacao_cuidado_destinatario_criado').on(t.destinatarioId, t.criadoEm),
    index('idx_notificacao_cuidado_ocorrencia').on(t.ocorrenciaId),
  ],
);
