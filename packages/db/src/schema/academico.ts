import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { citext } from './common';
import {
  areaConhecimentoEnum,
  importacaoStatusEnum,
  importacaoTipoEnum,
} from './enums';
import { anoLetivo, instituicao, turma, usuario } from './identidade';

// Gestão Acadêmica, Fase 1 (migração 0015). Toda tabela daqui carrega
// `instituicao_id`, que é por onde o RLS isola uma instituição da outra.
// Quando a linha também aponta para outra tabela da instituição (turma,
// disciplina, aluno), a FK é COMPOSTA com `instituicao_id`: o banco recusa
// ligar a turma de uma instituição à disciplina de outra, mesmo com bug na API.

/**
 * Regra avaliativa, versionada e SÓ DE INSERÇÃO (trigger na 0015 recusa
 * UPDATE e DELETE, até para o service role). Mudar a regra é gravar a versão
 * seguinte; a anterior fica como estava, para recalcular o passado.
 * `regra` é o JSON validado por `RegraAvaliativaSchema` (@notaa/contracts).
 */
export const regraAvaliativa = pgTable(
  'regra_avaliativa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instituicaoId: uuid('instituicao_id')
      .notNull()
      .references(() => instituicao.id, { onDelete: 'restrict' }),
    anoLetivoId: uuid('ano_letivo_id')
      .notNull()
      .references(() => anoLetivo.id, { onDelete: 'restrict' }),
    versao: integer('versao').notNull(),
    regra: jsonb('regra').notNull(),
    criadoPor: uuid('criado_por')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_regra_avaliativa_versao').on(t.instituicaoId, t.anoLetivoId, t.versao),
    unique('uq_regra_avaliativa_id_escopo').on(t.id, t.instituicaoId, t.anoLetivoId),
    check('ck_regra_avaliativa_versao', sql`${t.versao} >= 1`),
  ],
);

/**
 * Ativação de uma versão. Também só de inserção: a regra vigente é a da
 * ativação mais recente do (instituição, ano letivo). Assim ativar não
 * precisa de UPDATE em lugar nenhum, e o histórico de quem ativou o quê fica.
 */
export const regraAvaliativaAtivacao = pgTable(
  'regra_avaliativa_ativacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    regraId: uuid('regra_id').notNull(),
    instituicaoId: uuid('instituicao_id').notNull(),
    anoLetivoId: uuid('ano_letivo_id').notNull(),
    ativadoPor: uuid('ativado_por')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    ativadoEm: timestamp('ativado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // A ativação só aponta para regra do MESMO escopo.
    foreignKey({
      name: 'regra_avaliativa_ativacao_regra_escopo_fk',
      columns: [t.regraId, t.instituicaoId, t.anoLetivoId],
      foreignColumns: [regraAvaliativa.id, regraAvaliativa.instituicaoId, regraAvaliativa.anoLetivoId],
    }).onDelete('restrict'),
    index('idx_regra_ativacao_escopo').on(t.instituicaoId, t.anoLetivoId, t.ativadoEm),
  ],
);

/** Períodos avaliativos (bimestres, trimestres...) do ano letivo da instituição. */
export const periodoAvaliativo = pgTable(
  'periodo_avaliativo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instituicaoId: uuid('instituicao_id')
      .notNull()
      .references(() => instituicao.id, { onDelete: 'restrict' }),
    anoLetivoId: uuid('ano_letivo_id')
      .notNull()
      .references(() => anoLetivo.id, { onDelete: 'restrict' }),
    ordem: smallint('ordem').notNull(),
    nome: text('nome').notNull(),
    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_periodo_avaliativo_ordem').on(t.instituicaoId, t.anoLetivoId, t.ordem),
    check('ck_periodo_avaliativo_datas', sql`${t.dataFim} > ${t.dataInicio}`),
    check('ck_periodo_avaliativo_ordem', sql`${t.ordem} between 1 and 12`),
  ],
);

/**
 * Disciplina da instituição. `area_enem` liga a disciplina a uma das áreas do
 * ENEM (ou redação) para cruzar com o desempenho na plataforma. Nula para
 * disciplina sem área correspondente (ex.: ensino religioso).
 * Disciplina não é apagada, é arquivada: notas futuras apontarão para ela.
 */
export const disciplina = pgTable(
  'disciplina',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instituicaoId: uuid('instituicao_id')
      .notNull()
      .references(() => instituicao.id, { onDelete: 'restrict' }),
    nome: text('nome').notNull(),
    codigo: text('codigo'),
    areaEnem: areaConhecimentoEnum('area_enem'),
    arquivada: boolean('arquivada').notNull().default(false),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_disciplina_nome').on(t.instituicaoId, t.nome),
    unique('uq_disciplina_id_instituicao').on(t.id, t.instituicaoId),
    check(
      'ck_disciplina_area_enem',
      sql`${t.areaEnem} is null or ${t.areaEnem} in ('linguagens', 'humanas', 'natureza', 'matematica', 'redacao')`,
    ),
  ],
);

/** Qual disciplina cada turma tem, e quem leciona. Professor é opcional até ser atribuído. */
export const turmaDisciplina = pgTable(
  'turma_disciplina',
  {
    turmaId: uuid('turma_id').notNull(),
    disciplinaId: uuid('disciplina_id').notNull(),
    instituicaoId: uuid('instituicao_id').notNull(),
    professorId: uuid('professor_id').references(() => usuario.id, { onDelete: 'restrict' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.turmaId, t.disciplinaId] }),
    foreignKey({
      name: 'turma_disciplina_turma_escopo_fk',
      columns: [t.turmaId, t.instituicaoId],
      foreignColumns: [turma.id, turma.instituicaoId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'turma_disciplina_disciplina_escopo_fk',
      columns: [t.disciplinaId, t.instituicaoId],
      foreignColumns: [disciplina.id, disciplina.instituicaoId],
    }).onDelete('restrict'),
    index('idx_turma_disciplina_instituicao').on(t.instituicaoId),
    index('idx_turma_disciplina_professor').on(t.professorId),
  ],
);

/**
 * Cadastro do aluno NA instituição, como a secretaria o tem: matrícula, nome,
 * turma de referência. NÃO é conta: não dá acesso, não tem dado de estudo e
 * não abre janela de dados (isso continua sendo `matricula_turma`, com
 * consentimento do aluno). `usuario_id` liga o cadastro à conta quando o aluno
 * tiver uma.
 *
 * A chave natural é (instituição, matrícula): é por ela que a importação decide
 * entre criar e atualizar, e o que faz reimportar a mesma planilha criar zero.
 */
export const alunoInstituicao = pgTable(
  'aluno_instituicao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instituicaoId: uuid('instituicao_id')
      .notNull()
      .references(() => instituicao.id, { onDelete: 'restrict' }),
    matricula: text('matricula').notNull(),
    nome: text('nome').notNull(),
    dataNascimento: date('data_nascimento'),
    email: citext('email'),
    turmaId: uuid('turma_id'),
    usuarioId: uuid('usuario_id').references(() => usuario.id, { onDelete: 'restrict' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_aluno_instituicao_matricula').on(t.instituicaoId, t.matricula),
    unique('uq_aluno_instituicao_usuario').on(t.instituicaoId, t.usuarioId),
    unique('uq_aluno_instituicao_id_instituicao').on(t.id, t.instituicaoId),
    foreignKey({
      name: 'aluno_instituicao_turma_escopo_fk',
      columns: [t.turmaId, t.instituicaoId],
      foreignColumns: [turma.id, turma.instituicaoId],
    }).onDelete('restrict'),
    index('idx_aluno_instituicao_turma').on(t.turmaId),
  ],
);

/**
 * Responsável cadastrado pela instituição para um aluno. Casado por e-mail: o
 * mesmo e-mail no mesmo aluno é a mesma pessoa. É registro de contato da
 * secretaria e NÃO substitui `vinculo_responsavel` (que dá acesso ao dado de
 * estudo e exige consentimento) — perfis-decisoes.md deixa o papel de
 * responsável intocado nesta etapa.
 */
export const responsavelAluno = pgTable(
  'responsavel_aluno',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instituicaoId: uuid('instituicao_id').notNull(),
    alunoInstituicaoId: uuid('aluno_instituicao_id').notNull(),
    nome: text('nome').notNull(),
    email: citext('email').notNull(),
    telefone: text('telefone'),
    parentesco: text('parentesco'),
    usuarioId: uuid('usuario_id').references(() => usuario.id, { onDelete: 'restrict' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'responsavel_aluno_aluno_escopo_fk',
      columns: [t.alunoInstituicaoId, t.instituicaoId],
      foreignColumns: [alunoInstituicao.id, alunoInstituicao.instituicaoId],
    }).onDelete('cascade'),
    unique('uq_responsavel_aluno_email').on(t.alunoInstituicaoId, t.email),
    unique('uq_responsavel_aluno_id_instituicao').on(t.id, t.instituicaoId),
    index('idx_responsavel_aluno_instituicao').on(t.instituicaoId),
    index('idx_responsavel_aluno_usuario').on(t.usuarioId),
  ],
);

/**
 * Importação de planilha. É também a FILA do worker: confirmar muda o status
 * para 'pendente', e o worker pega com FOR UPDATE SKIP LOCKED.
 * O arquivo fica no Storage (bucket privado `importacoes`), nunca no banco.
 */
export const importacao = pgTable(
  'importacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instituicaoId: uuid('instituicao_id')
      .notNull()
      .references(() => instituicao.id, { onDelete: 'restrict' }),
    tipo: importacaoTipoEnum('tipo').notNull(),
    status: importacaoStatusEnum('status').notNull().default('aguardando_arquivo'),
    nomeArquivo: text('nome_arquivo').notNull(),
    arquivoPath: text('arquivo_path').notNull(),
    formato: text('formato'),
    tamanhoBytes: integer('tamanho_bytes'),
    totalLinhas: integer('total_linhas'),
    cabecalhos: jsonb('cabecalhos'),
    mapeamento: jsonb('mapeamento'),
    resumoPrevia: jsonb('resumo_previa'),
    linhasProcessadas: integer('linhas_processadas').notNull().default(0),
    relatorio: jsonb('relatorio'),
    erro: text('erro'),
    tentativas: integer('tentativas').notNull().default(0),
    criadoPor: uuid('criado_por')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
    confirmadoEm: timestamp('confirmado_em', { withTimezone: true }),
    iniciadoEm: timestamp('iniciado_em', { withTimezone: true }),
    concluidoEm: timestamp('concluido_em', { withTimezone: true }),
  },
  (t) => [
    index('idx_importacao_instituicao').on(t.instituicaoId, t.criadoEm),
    index('idx_importacao_fila').on(t.status, t.confirmadoEm),
    check('ck_importacao_formato', sql`${t.formato} is null or ${t.formato} in ('csv', 'xlsx')`),
  ],
);

/**
 * Trilha de auditoria da instituição (doc 10 §5). SÓ DE INSERÇÃO: trigger na
 * 0015 recusa UPDATE e DELETE. `log_auditoria_admin` continua sendo do admin
 * da PLATAFORMA; este é das ações dentro de uma instituição.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instituicaoId: uuid('instituicao_id').references(() => instituicao.id, {
      onDelete: 'restrict',
    }),
    atorId: uuid('ator_id').references(() => usuario.id, { onDelete: 'restrict' }),
    papel: text('papel'),
    acao: text('acao').notNull(),
    entidade: text('entidade').notNull(),
    entidadeId: uuid('entidade_id'),
    dados: jsonb('dados').notNull().default({}),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_audit_log_instituicao').on(t.instituicaoId, t.criadoEm),
    index('idx_audit_log_entidade').on(t.entidade, t.entidadeId),
  ],
);

/**
 * Convite para o responsável ligar a própria conta ao cadastro do aluno
 * (migração 0016). O token é uma credencial de 32 bytes aleatórios que só
 * existe em claro na resposta da criação; aqui fica o SHA-256 dele. Expira,
 * vale uma vez (`usado_em`) e pode ser revogado.
 */
export const conviteResponsavel = pgTable(
  'convite_responsavel',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instituicaoId: uuid('instituicao_id')
      .notNull()
      .references(() => instituicao.id, { onDelete: 'restrict' }),
    responsavelAlunoId: uuid('responsavel_aluno_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
    usadoEm: timestamp('usado_em', { withTimezone: true }),
    usadoPor: uuid('usado_por').references(() => usuario.id, { onDelete: 'restrict' }),
    revogadoEm: timestamp('revogado_em', { withTimezone: true }),
    criadoPor: uuid('criado_por')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_convite_responsavel_token_hash').on(t.tokenHash),
    unique('uq_convite_responsavel_id_instituicao').on(t.id, t.instituicaoId),
    foreignKey({
      name: 'convite_responsavel_responsavel_escopo_fk',
      columns: [t.responsavelAlunoId, t.instituicaoId],
      foreignColumns: [responsavelAluno.id, responsavelAluno.instituicaoId],
    }).onDelete('cascade'),
    check('ck_convite_responsavel_expiracao', sql`${t.expiraEm} > ${t.criadoEm}`),
    index('idx_convite_responsavel_responsavel').on(t.responsavelAlunoId),
  ],
);

/**
 * Consentimento do responsável: quem, quando e qual versão do termo. SÓ DE
 * INSERÇÃO (trigger na 0016). É a condição para o responsável ler o aluno.
 */
export const consentimentoResponsavel = pgTable(
  'consentimento_responsavel',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instituicaoId: uuid('instituicao_id')
      .notNull()
      .references(() => instituicao.id, { onDelete: 'restrict' }),
    responsavelAlunoId: uuid('responsavel_aluno_id').notNull(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    conviteId: uuid('convite_id'),
    versaoTermo: text('versao_termo').notNull(),
    aceitoEm: timestamp('aceito_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_consentimento_responsavel_versao').on(t.responsavelAlunoId, t.versaoTermo),
    foreignKey({
      name: 'consentimento_responsavel_responsavel_escopo_fk',
      columns: [t.responsavelAlunoId, t.instituicaoId],
      foreignColumns: [responsavelAluno.id, responsavelAluno.instituicaoId],
    }).onDelete('restrict'),
    foreignKey({
      name: 'consentimento_responsavel_convite_escopo_fk',
      columns: [t.conviteId, t.instituicaoId],
      foreignColumns: [conviteResponsavel.id, conviteResponsavel.instituicaoId],
    }).onDelete('restrict'),
    index('idx_consentimento_responsavel_usuario').on(t.usuarioId),
  ],
);
