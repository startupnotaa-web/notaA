-- Gestão Acadêmica, Fase 1: regra avaliativa, períodos, disciplinas, cadastro
-- de alunos e responsáveis da instituição, importação e trilha de auditoria.
--
-- Escrita à mão, idempotente, no estilo da 0013. O snapshot em
-- meta/0015_snapshot.json foi gerado por `drizzle-kit generate` a partir do
-- schema TS e reflete o banco INTEIRO depois desta migração; o SQL que o
-- drizzle-kit gerou foi descartado, porque ele refaria a 0010–0014 (escritas à
-- mão e sem snapshot próprio).
--
-- Decisões (2026-10-16):
-- - Coordenação é FUNÇÃO dentro de admin_instituicao, não papel novo: o enum de
--   papel vai no JWT, e mudá-lo quebra deploys antigos da API.
-- - Aluno importado é CADASTRO da instituição (`aluno_instituicao`), sem conta.
--   Não abre janela de dados; isso continua em `matricula_turma`.
-- - `responsavel_aluno` é contato da secretaria e NÃO toca `vinculo_responsavel`.
--
-- RLS: todas as tabelas novas isolam por instituicao_id. Só há políticas de
-- SELECT, como no resto do schema; quem escreve é a API com service role.
-- regra_avaliativa, regra_avaliativa_ativacao e audit_log são SÓ DE INSERÇÃO,
-- garantido por trigger (vale até para o service role).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enums
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "funcao_instituicao" AS ENUM ('gestor', 'coordenacao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "importacao_tipo" AS ENUM ('alunos', 'disciplinas');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "importacao_status" AS ENUM (
    'aguardando_arquivo', 'em_previa', 'pendente', 'processando', 'concluida', 'falhou'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Função do admin de instituição (gestor | coordenação)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "funcao_instituicao" "funcao_instituicao";

-- Todo admin de instituição que já existe é gestor: é o que ele já fazia.
UPDATE "usuario" SET "funcao_instituicao" = 'gestor'
  WHERE "tipo_perfil" = 'admin_instituicao' AND "funcao_instituicao" IS NULL;

DO $$ BEGIN
  ALTER TABLE "usuario" ADD CONSTRAINT "ck_usuario_funcao_so_admin_instituicao"
    CHECK ("funcao_instituicao" IS NULL OR "tipo_perfil" = 'admin_instituicao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Alvo das FKs compostas (turma_id, instituicao_id).
DO $$ BEGIN
  ALTER TABLE "turma" ADD CONSTRAINT "uq_turma_id_instituicao" UNIQUE ("id", "instituicao_id");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Regra avaliativa (versionada) e ativação
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "regra_avaliativa" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instituicao_id" uuid NOT NULL REFERENCES "instituicao"("id") ON DELETE restrict,
  "ano_letivo_id" uuid NOT NULL REFERENCES "ano_letivo"("id") ON DELETE restrict,
  "versao" integer NOT NULL,
  "regra" jsonb NOT NULL,
  "criado_por" uuid NOT NULL REFERENCES "usuario"("id") ON DELETE restrict,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uq_regra_avaliativa_versao" UNIQUE ("instituicao_id", "ano_letivo_id", "versao"),
  CONSTRAINT "uq_regra_avaliativa_id_escopo" UNIQUE ("id", "instituicao_id", "ano_letivo_id"),
  CONSTRAINT "ck_regra_avaliativa_versao" CHECK ("versao" >= 1)
);

CREATE TABLE IF NOT EXISTS "regra_avaliativa_ativacao" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "regra_id" uuid NOT NULL,
  "instituicao_id" uuid NOT NULL,
  "ano_letivo_id" uuid NOT NULL,
  "ativado_por" uuid NOT NULL REFERENCES "usuario"("id") ON DELETE restrict,
  "ativado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "regra_avaliativa_ativacao_regra_escopo_fk"
    FOREIGN KEY ("regra_id", "instituicao_id", "ano_letivo_id")
    REFERENCES "regra_avaliativa"("id", "instituicao_id", "ano_letivo_id") ON DELETE restrict
);
CREATE INDEX IF NOT EXISTS "idx_regra_ativacao_escopo"
  ON "regra_avaliativa_ativacao" ("instituicao_id", "ano_letivo_id", "ativado_em");

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Períodos avaliativos e disciplinas
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "periodo_avaliativo" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instituicao_id" uuid NOT NULL REFERENCES "instituicao"("id") ON DELETE restrict,
  "ano_letivo_id" uuid NOT NULL REFERENCES "ano_letivo"("id") ON DELETE restrict,
  "ordem" smallint NOT NULL,
  "nome" text NOT NULL,
  "data_inicio" date NOT NULL,
  "data_fim" date NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uq_periodo_avaliativo_ordem" UNIQUE ("instituicao_id", "ano_letivo_id", "ordem"),
  CONSTRAINT "ck_periodo_avaliativo_datas" CHECK ("data_fim" > "data_inicio"),
  CONSTRAINT "ck_periodo_avaliativo_ordem" CHECK ("ordem" BETWEEN 1 AND 12)
);

CREATE TABLE IF NOT EXISTS "disciplina" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instituicao_id" uuid NOT NULL REFERENCES "instituicao"("id") ON DELETE restrict,
  "nome" text NOT NULL,
  "codigo" text,
  "area_enem" "area_conhecimento",
  "arquivada" boolean DEFAULT false NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uq_disciplina_nome" UNIQUE ("instituicao_id", "nome"),
  CONSTRAINT "uq_disciplina_id_instituicao" UNIQUE ("id", "instituicao_id"),
  -- Só as quatro áreas do ENEM e redação; 'fin', 'soc' e 'art' são trilhas da plataforma.
  CONSTRAINT "ck_disciplina_area_enem" CHECK (
    "area_enem" IS NULL OR "area_enem" IN ('linguagens', 'humanas', 'natureza', 'matematica', 'redacao')
  )
);

CREATE TABLE IF NOT EXISTS "turma_disciplina" (
  "turma_id" uuid NOT NULL,
  "disciplina_id" uuid NOT NULL,
  "instituicao_id" uuid NOT NULL,
  "professor_id" uuid REFERENCES "usuario"("id") ON DELETE restrict,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "turma_disciplina_turma_id_disciplina_id_pk" PRIMARY KEY ("turma_id", "disciplina_id"),
  CONSTRAINT "turma_disciplina_turma_escopo_fk"
    FOREIGN KEY ("turma_id", "instituicao_id")
    REFERENCES "turma"("id", "instituicao_id") ON DELETE cascade,
  CONSTRAINT "turma_disciplina_disciplina_escopo_fk"
    FOREIGN KEY ("disciplina_id", "instituicao_id")
    REFERENCES "disciplina"("id", "instituicao_id") ON DELETE restrict
);
CREATE INDEX IF NOT EXISTS "idx_turma_disciplina_instituicao" ON "turma_disciplina" ("instituicao_id");
CREATE INDEX IF NOT EXISTS "idx_turma_disciplina_professor" ON "turma_disciplina" ("professor_id");

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Cadastro de alunos e responsáveis da instituição
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "aluno_instituicao" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instituicao_id" uuid NOT NULL REFERENCES "instituicao"("id") ON DELETE restrict,
  "matricula" text NOT NULL,
  "nome" text NOT NULL,
  "data_nascimento" date,
  "email" citext,
  "turma_id" uuid,
  "usuario_id" uuid REFERENCES "usuario"("id") ON DELETE restrict,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uq_aluno_instituicao_matricula" UNIQUE ("instituicao_id", "matricula"),
  CONSTRAINT "uq_aluno_instituicao_usuario" UNIQUE ("instituicao_id", "usuario_id"),
  CONSTRAINT "uq_aluno_instituicao_id_instituicao" UNIQUE ("id", "instituicao_id"),
  CONSTRAINT "aluno_instituicao_turma_escopo_fk"
    FOREIGN KEY ("turma_id", "instituicao_id")
    REFERENCES "turma"("id", "instituicao_id") ON DELETE restrict
);
CREATE INDEX IF NOT EXISTS "idx_aluno_instituicao_turma" ON "aluno_instituicao" ("turma_id");

CREATE TABLE IF NOT EXISTS "responsavel_aluno" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instituicao_id" uuid NOT NULL,
  "aluno_instituicao_id" uuid NOT NULL,
  "nome" text NOT NULL,
  "email" citext NOT NULL,
  "telefone" text,
  "parentesco" text,
  "usuario_id" uuid REFERENCES "usuario"("id") ON DELETE restrict,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "responsavel_aluno_aluno_escopo_fk"
    FOREIGN KEY ("aluno_instituicao_id", "instituicao_id")
    REFERENCES "aluno_instituicao"("id", "instituicao_id") ON DELETE cascade,
  CONSTRAINT "uq_responsavel_aluno_email" UNIQUE ("aluno_instituicao_id", "email")
);
CREATE INDEX IF NOT EXISTS "idx_responsavel_aluno_instituicao" ON "responsavel_aluno" ("instituicao_id");
CREATE INDEX IF NOT EXISTS "idx_responsavel_aluno_usuario" ON "responsavel_aluno" ("usuario_id");

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Importação (também é a fila do worker)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "importacao" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instituicao_id" uuid NOT NULL REFERENCES "instituicao"("id") ON DELETE restrict,
  "tipo" "importacao_tipo" NOT NULL,
  "status" "importacao_status" DEFAULT 'aguardando_arquivo' NOT NULL,
  "nome_arquivo" text NOT NULL,
  "arquivo_path" text NOT NULL,
  "formato" text,
  "tamanho_bytes" integer,
  "total_linhas" integer,
  "cabecalhos" jsonb,
  "mapeamento" jsonb,
  "resumo_previa" jsonb,
  "linhas_processadas" integer DEFAULT 0 NOT NULL,
  "relatorio" jsonb,
  "erro" text,
  "tentativas" integer DEFAULT 0 NOT NULL,
  "criado_por" uuid NOT NULL REFERENCES "usuario"("id") ON DELETE restrict,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "confirmado_em" timestamp with time zone,
  "iniciado_em" timestamp with time zone,
  "concluido_em" timestamp with time zone,
  CONSTRAINT "ck_importacao_formato" CHECK ("formato" IS NULL OR "formato" IN ('csv', 'xlsx'))
);
CREATE INDEX IF NOT EXISTS "idx_importacao_instituicao" ON "importacao" ("instituicao_id", "criado_em");
CREATE INDEX IF NOT EXISTS "idx_importacao_fila" ON "importacao" ("status", "confirmado_em");

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Trilha de auditoria da instituição
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instituicao_id" uuid REFERENCES "instituicao"("id") ON DELETE restrict,
  "ator_id" uuid REFERENCES "usuario"("id") ON DELETE restrict,
  "papel" text,
  "acao" text NOT NULL,
  "entidade" text NOT NULL,
  "entidade_id" uuid,
  "dados" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_audit_log_instituicao" ON "audit_log" ("instituicao_id", "criado_em");
CREATE INDEX IF NOT EXISTS "idx_audit_log_entidade" ON "audit_log" ("entidade", "entidade_id");

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Só de inserção: regra, ativação e auditoria
-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger, não só REVOKE: o service role tem todos os privilégios e ignora
-- RLS, e é justamente ele que a API usa. Assim nem um bug na API reescreve o
-- histórico.
CREATE OR REPLACE FUNCTION "impede_alteracao_historico"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'A tabela % é só de inserção: % não é permitido.', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['regra_avaliativa', 'regra_avaliativa_ativacao', 'audit_log'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS "trg_%s_imutavel" ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER "trg_%s_imutavel" BEFORE UPDATE OR DELETE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION "impede_alteracao_historico"()', t, t);
    EXECUTE format('DROP TRIGGER IF EXISTS "trg_%s_sem_truncate" ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER "trg_%s_sem_truncate" BEFORE TRUNCATE ON %I '
      'FOR EACH STATEMENT EXECUTE FUNCTION "impede_alteracao_historico"()', t, t);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Helpers de RLS
-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER com search_path fixo: leem `usuario`, `professor_turma` e
-- `matricula_turma` sem depender das políticas dessas tabelas (que não deixam
-- ler linha alheia) e sem recursão entre políticas.

-- Mesmo corpo de supabase/policies/0001; repetido aqui para a migração subir
-- sozinha num banco limpo.
CREATE OR REPLACE FUNCTION auth_current_usuario_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM usuario WHERE auth_uid = auth.uid()
$$;

-- Instituição de quem trabalha nela (admin ou professor institucional).
-- Aluno não tem coluna de instituição: o vínculo dele vem das turmas.
CREATE OR REPLACE FUNCTION auth_instituicao_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT instituicao_id FROM usuario
   WHERE auth_uid = auth.uid()
     AND tipo_perfil IN ('admin_instituicao', 'professor_institucional')
$$;

-- Instituição do admin, e só se ele for admin. NULL para qualquer outro papel.
CREATE OR REPLACE FUNCTION auth_instituicao_admin() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT instituicao_id FROM usuario
   WHERE auth_uid = auth.uid() AND tipo_perfil = 'admin_instituicao'
$$;

-- Instituição do admin com função de gestor. Coordenação não vê a auditoria.
CREATE OR REPLACE FUNCTION auth_instituicao_gestor() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT instituicao_id FROM usuario
   WHERE auth_uid = auth.uid()
     AND tipo_perfil = 'admin_instituicao'
     AND coalesce(funcao_instituicao, 'gestor') = 'gestor'
$$;

CREATE OR REPLACE FUNCTION auth_turmas_professor() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pt.turma_id FROM professor_turma pt
    JOIN usuario u ON u.id = pt.professor_id
   WHERE u.auth_uid = auth.uid() AND u.tipo_perfil = 'professor_institucional'
$$;

-- Instituições em que o aluno tem matrícula ATIVA (perfis-decisoes.md).
CREATE OR REPLACE FUNCTION auth_instituicoes_aluno() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT t.instituicao_id FROM matricula_turma m
    JOIN turma t ON t.id = m.turma_id
    JOIN usuario u ON u.id = m.estudante_id
   WHERE u.auth_uid = auth.uid()
     AND u.tipo_perfil = 'estudante'
     AND m.status = 'ativa'
     AND t.instituicao_id IS NOT NULL
$$;

-- Cadastros de aluno a que o responsável logado está ligado.
CREATE OR REPLACE FUNCTION auth_alunos_do_responsavel() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.aluno_instituicao_id FROM responsavel_aluno r
    JOIN usuario u ON u.id = r.usuario_id
   WHERE u.auth_uid = auth.uid() AND u.tipo_perfil = 'responsavel'
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'auth_current_usuario_id()', 'auth_instituicao_id()', 'auth_instituicao_admin()',
    'auth_instituicao_gestor()', 'auth_turmas_professor()', 'auth_instituicoes_aluno()',
    'auth_alunos_do_responsavel()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "regra_avaliativa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "regra_avaliativa_ativacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "periodo_avaliativo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "disciplina" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "turma_disciplina" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aluno_instituicao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "responsavel_aluno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "importacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;

-- Configuração acadêmica: quem trabalha na instituição (gestor, coordenação,
-- professor) e aluno com matrícula ativa nela leem. Responsável não.
DROP POLICY IF EXISTS "p_regra_avaliativa_leitura" ON "regra_avaliativa";
CREATE POLICY "p_regra_avaliativa_leitura" ON "regra_avaliativa" FOR SELECT USING (
  instituicao_id = auth_instituicao_id()
  OR instituicao_id IN (SELECT auth_instituicoes_aluno())
);

DROP POLICY IF EXISTS "p_regra_avaliativa_ativacao_leitura" ON "regra_avaliativa_ativacao";
CREATE POLICY "p_regra_avaliativa_ativacao_leitura" ON "regra_avaliativa_ativacao" FOR SELECT USING (
  instituicao_id = auth_instituicao_id()
  OR instituicao_id IN (SELECT auth_instituicoes_aluno())
);

DROP POLICY IF EXISTS "p_periodo_avaliativo_leitura" ON "periodo_avaliativo";
CREATE POLICY "p_periodo_avaliativo_leitura" ON "periodo_avaliativo" FOR SELECT USING (
  instituicao_id = auth_instituicao_id()
  OR instituicao_id IN (SELECT auth_instituicoes_aluno())
);

DROP POLICY IF EXISTS "p_disciplina_leitura" ON "disciplina";
CREATE POLICY "p_disciplina_leitura" ON "disciplina" FOR SELECT USING (
  instituicao_id = auth_instituicao_id()
  OR instituicao_id IN (SELECT auth_instituicoes_aluno())
);

-- Atribuição de disciplina: admin vê a instituição; professor, só as turmas dele.
DROP POLICY IF EXISTS "p_turma_disciplina_leitura" ON "turma_disciplina";
CREATE POLICY "p_turma_disciplina_leitura" ON "turma_disciplina" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin()
  OR turma_id IN (SELECT auth_turmas_professor())
);

-- Cadastro do aluno: admin vê a instituição; professor, os das turmas dele; o
-- próprio aluno, a sua linha; o responsável, a do aluno ligado a ele.
DROP POLICY IF EXISTS "p_aluno_instituicao_leitura" ON "aluno_instituicao";
CREATE POLICY "p_aluno_instituicao_leitura" ON "aluno_instituicao" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin()
  OR turma_id IN (SELECT auth_turmas_professor())
  OR (usuario_id IS NOT NULL AND usuario_id = auth_current_usuario_id())
  OR id IN (SELECT auth_alunos_do_responsavel())
);

DROP POLICY IF EXISTS "p_responsavel_aluno_leitura" ON "responsavel_aluno";
CREATE POLICY "p_responsavel_aluno_leitura" ON "responsavel_aluno" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin()
  OR (usuario_id IS NOT NULL AND usuario_id = auth_current_usuario_id())
);

DROP POLICY IF EXISTS "p_importacao_leitura" ON "importacao";
CREATE POLICY "p_importacao_leitura" ON "importacao" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin()
);

DROP POLICY IF EXISTS "p_audit_log_leitura" ON "audit_log";
CREATE POLICY "p_audit_log_leitura" ON "audit_log" FOR SELECT USING (
  instituicao_id = auth_instituicao_gestor()
);

-- Nenhuma política de escrita: o acesso direto (anon/authenticated) só lê.
-- O REVOKE reforça isso nas três tabelas de histórico, mesmo que alguém crie
-- uma política de escrita por engano no futuro.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "regra_avaliativa", '
        '"regra_avaliativa_ativacao", "audit_log" FROM %I', r);
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Storage: bucket privado das planilhas
-- ─────────────────────────────────────────────────────────────────────────────
-- Sem política para anon/authenticated: só o service role lê e grava. O
-- navegador envia por URL assinada de upload, emitida pela API para um caminho
-- fixo (`<instituicao_id>/<importacao_id>`). 10 MB é limite do bucket e é
-- conferido de novo pela API ao baixar.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'importacoes', 'importacoes', false, 10485760,
      ARRAY[
        'text/csv', 'text/plain', 'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;
