import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
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
import {
  matriculaStatusEnum,
  statusUsuarioEnum,
  tipoPerfilEnum,
  vinculoStatusEnum,
} from './enums';

// doc 04 §2 — Identidade e acesso

export const instituicao = pgTable('instituicao', {
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
    instituicaoId: uuid('instituicao_id').references(() => instituicao.id, { onDelete: 'restrict' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_usuario_email').on(t.email),
    index('idx_usuario_instituicao').on(t.instituicaoId),
    index('idx_usuario_tipo_perfil').on(t.tipoPerfil),
  ],
);

/**
 * Convite para um professor virar professor institucional desta instituição.
 *
 * perfis.md: o professor institucional NÃO se auto-cadastra, ele entra por
 * convite. A entrega é por link gerado na tela (decisão do usuário), sem
 * dependência de e-mail transacional. O `email` aqui é só registro de para quem
 * o convite foi feito; quem valida é o token.
 *
 * O token tem prazo porque é uma credencial: quem tiver o link entra na
 * instituição. `usadoEm` o queima depois do primeiro uso.
 */
export const conviteProfessor = pgTable(
  'convite_professor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instituicaoId: uuid('instituicao_id')
      .notNull()
      .references(() => instituicao.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    email: citext('email'),
    criadoPor: uuid('criado_por')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
    usadoEm: timestamp('usado_em', { withTimezone: true }),
    usadoPor: uuid('usado_por').references(() => usuario.id, { onDelete: 'restrict' }),
    revogadoEm: timestamp('revogado_em', { withTimezone: true }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_convite_professor_instituicao').on(t.instituicaoId),
    index('idx_convite_professor_expira').on(t.expiraEm),
  ],
);

/**
 * Ano letivo — rótulo GLOBAL da plataforma, igual para todos (ex.: "2026").
 * As datas de início e fim NÃO ficam aqui: cada dono de turma define as suas em
 * `anoLetivoPeriodo`, porque calendário de instituição varia.
 */
export const anoLetivo = pgTable('ano_letivo', {
  id: uuid('id').primaryKey().defaultRandom(),
  rotulo: text('rotulo').notNull().unique(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * O recorte de um ano letivo para UM dono: datas e arquivamento.
 *
 * Mesmo padrão de titularidade exclusiva de `assinatura`: duas colunas, só uma
 * preenchida. O dono é uma instituição OU um professor independente, nunca os
 * dois — perfis.md trata turma como um conceito único para os dois casos.
 *
 * Arquivar o ano aqui é o que torna as turmas dele somente leitura.
 */
export const anoLetivoPeriodo = pgTable(
  'ano_letivo_periodo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    anoLetivoId: uuid('ano_letivo_id')
      .notNull()
      .references(() => anoLetivo.id, { onDelete: 'restrict' }),
    instituicaoId: uuid('instituicao_id').references(() => instituicao.id, {
      onDelete: 'restrict',
    }),
    professorDonoId: uuid('professor_dono_id').references(() => usuario.id, {
      onDelete: 'restrict',
    }),
    dataInicio: date('data_inicio'),
    dataFim: date('data_fim'),
    arquivado: boolean('arquivado').notNull().default(false),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // NULL não colide com NULL no Postgres, então cada unique vale só para o
    // dono daquele tipo — sem precisar de índice parcial.
    unique('uq_periodo_ano_instituicao').on(t.anoLetivoId, t.instituicaoId),
    unique('uq_periodo_ano_professor').on(t.anoLetivoId, t.professorDonoId),
    index('idx_periodo_instituicao').on(t.instituicaoId),
    index('idx_periodo_professor').on(t.professorDonoId),
    check(
      'ck_periodo_dono_unico',
      sql`(${t.instituicaoId} is not null and ${t.professorDonoId} is null) or (${t.instituicaoId} is null and ${t.professorDonoId} is not null)`,
    ),
  ],
);

/**
 * Turma. Toda turma pertence a um ano letivo e a exatamente um dono: uma
 * instituição ou um professor independente.
 *
 * `professor_id` (uma coluna só) saiu: perfis.md permite VÁRIOS professores por
 * turma, então o vínculo vive em `professorTurma`. A regra "turma sem professor
 * não aceita aluno" é de aplicação, não de banco — o fluxo de criação da
 * instituição cria a turma antes de vincular professores.
 *
 * O código de convite é por turma e expira (uma semana, perfis.md). Regenerar
 * troca o código e NUNCA mexe nas matrículas de quem já entrou.
 */
export const turma = pgTable(
  'turma',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instituicaoId: uuid('instituicao_id').references(() => instituicao.id, {
      onDelete: 'restrict',
    }),
    professorDonoId: uuid('professor_dono_id').references(() => usuario.id, {
      onDelete: 'restrict',
    }),
    anoLetivoId: uuid('ano_letivo_id')
      .notNull()
      .references(() => anoLetivo.id, { onDelete: 'restrict' }),
    nome: text('nome').notNull(),
    codigoConvite: text('codigo_convite').unique(),
    codigoExpiraEm: timestamp('codigo_expira_em', { withTimezone: true }),
    arquivada: boolean('arquivada').notNull().default(false),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_turma_instituicao_ano_nome').on(t.instituicaoId, t.anoLetivoId, t.nome),
    unique('uq_turma_professor_ano_nome').on(t.professorDonoId, t.anoLetivoId, t.nome),
    index('idx_turma_instituicao').on(t.instituicaoId),
    index('idx_turma_professor_dono').on(t.professorDonoId),
    index('idx_turma_ano_letivo').on(t.anoLetivoId),
    check(
      'ck_turma_dono_unico',
      sql`(${t.instituicaoId} is not null and ${t.professorDonoId} is null) or (${t.instituicaoId} is null and ${t.professorDonoId} is not null)`,
    ),
  ],
);

/**
 * Quem leciona em cada turma. Vários professores por turma, várias turmas por
 * professor. Vale para professor institucional e independente.
 *
 * É esta tabela que define o escopo do painel do professor: ele só vê as turmas
 * em que está aqui.
 */
export const professorTurma = pgTable(
  'professor_turma',
  {
    turmaId: uuid('turma_id')
      .notNull()
      .references(() => turma.id, { onDelete: 'cascade' }),
    professorId: uuid('professor_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.turmaId, t.professorId] }),
    index('idx_professor_turma_professor').on(t.professorId),
  ],
);

/**
 * Matrícula do aluno na turma — e, antes dela, a solicitação de entrada.
 *
 * `aprovadoEm` não é só auditoria: é o INÍCIO DA JANELA DE DADOS. Instituição e
 * professor só podem ver o que o aluno gerou depois desse instante (perfis.md).
 * Toda consulta de desempenho por turma precisa filtrar por ele.
 *
 * `consentimentoEm` registra o consentimento explícito do aluno para aquela
 * turma. É por turma, não por instituição: entrar numa turma nova pede
 * consentimento de novo.
 *
 * A chave segue sendo (turma, estudante): se um aluno for removido e voltar, a
 * linha é reaproveitada e a janela de dados recomeça na nova aprovação. Não
 * guardamos histórico de entradas anteriores — se isso virar requisito, troca
 * para id próprio.
 */
export const matriculaTurma = pgTable(
  'matricula_turma',
  {
    turmaId: uuid('turma_id')
      .notNull()
      .references(() => turma.id, { onDelete: 'restrict' }),
    estudanteId: uuid('estudante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    status: matriculaStatusEnum('status').notNull().default('pendente'),
    solicitadoEm: timestamp('solicitado_em', { withTimezone: true }).notNull().defaultNow(),
    consentimentoEm: timestamp('consentimento_em', { withTimezone: true }).notNull().defaultNow(),
    aprovadoEm: timestamp('aprovado_em', { withTimezone: true }),
    aprovadoPor: uuid('aprovado_por').references(() => usuario.id, { onDelete: 'restrict' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.turmaId, t.estudanteId] }),
    index('idx_matricula_estudante_status').on(t.estudanteId, t.status),
    index('idx_matricula_turma_status').on(t.turmaId, t.status),
    // Matrícula ativa SEMPRE tem data de aprovação — é o que delimita a janela
    // de dados. Sem isso, um bug de escrita abriria o histórico inteiro do aluno.
    check(
      'ck_matricula_ativa_tem_aprovacao',
      sql`${t.status} <> 'ativa' or ${t.aprovadoEm} is not null`,
    ),
  ],
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
