-- Correções da revisão de segurança da Gestão Acadêmica, Fase 1 (2026-10-17).
--
-- Escrita à mão, idempotente, no estilo da 0015. O snapshot em
-- meta/0016_snapshot.json vem de `drizzle-kit generate` a partir do schema TS;
-- o SQL que o drizzle-kit gerou foi descartado (como na 0015), porque ele não
-- conhece triggers, views, funções nem os REVOKEs daqui.
--
-- 1. Responsável: vínculo por convite + consentimento, e leitura do aluno por
--    view sem data de nascimento nem e-mail.
-- 2. audit_log sem dado pessoal, com limpeza do que já foi gravado.
-- (As demais seções entram nos commits seguintes.)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Convite e consentimento do responsável
-- ─────────────────────────────────────────────────────────────────────────────
-- Alvo das FKs compostas (id, instituicao_id).
DO $$ BEGIN
  ALTER TABLE "responsavel_aluno"
    ADD CONSTRAINT "uq_responsavel_aluno_id_instituicao" UNIQUE ("id", "instituicao_id");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- O token é uma credencial (32 bytes aleatórios). Só o SHA-256 dele fica aqui.
CREATE TABLE IF NOT EXISTS "convite_responsavel" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instituicao_id" uuid NOT NULL REFERENCES "instituicao"("id") ON DELETE restrict,
  "responsavel_aluno_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expira_em" timestamp with time zone NOT NULL,
  "usado_em" timestamp with time zone,
  "usado_por" uuid REFERENCES "usuario"("id") ON DELETE restrict,
  "revogado_em" timestamp with time zone,
  "criado_por" uuid NOT NULL REFERENCES "usuario"("id") ON DELETE restrict,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uq_convite_responsavel_token_hash" UNIQUE ("token_hash"),
  CONSTRAINT "uq_convite_responsavel_id_instituicao" UNIQUE ("id", "instituicao_id"),
  CONSTRAINT "ck_convite_responsavel_expiracao" CHECK ("expira_em" > "criado_em"),
  CONSTRAINT "convite_responsavel_responsavel_escopo_fk"
    FOREIGN KEY ("responsavel_aluno_id", "instituicao_id")
    REFERENCES "responsavel_aluno"("id", "instituicao_id") ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS "idx_convite_responsavel_responsavel"
  ON "convite_responsavel" ("responsavel_aluno_id");

-- Quem, quando e qual versão do termo. Só de inserção, como o histórico da 0015.
CREATE TABLE IF NOT EXISTS "consentimento_responsavel" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instituicao_id" uuid NOT NULL REFERENCES "instituicao"("id") ON DELETE restrict,
  "responsavel_aluno_id" uuid NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuario"("id") ON DELETE restrict,
  "convite_id" uuid,
  "versao_termo" text NOT NULL,
  "aceito_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uq_consentimento_responsavel_versao" UNIQUE ("responsavel_aluno_id", "versao_termo"),
  CONSTRAINT "consentimento_responsavel_responsavel_escopo_fk"
    FOREIGN KEY ("responsavel_aluno_id", "instituicao_id")
    REFERENCES "responsavel_aluno"("id", "instituicao_id") ON DELETE restrict,
  CONSTRAINT "consentimento_responsavel_convite_escopo_fk"
    FOREIGN KEY ("convite_id", "instituicao_id")
    REFERENCES "convite_responsavel"("id", "instituicao_id") ON DELETE restrict
);
CREATE INDEX IF NOT EXISTS "idx_consentimento_responsavel_usuario"
  ON "consentimento_responsavel" ("usuario_id");

DO $$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS "trg_consentimento_responsavel_imutavel" ON "consentimento_responsavel"';
  EXECUTE 'CREATE TRIGGER "trg_consentimento_responsavel_imutavel" BEFORE UPDATE OR DELETE ON "consentimento_responsavel" '
          'FOR EACH ROW EXECUTE FUNCTION "impede_alteracao_historico"()';
  EXECUTE 'DROP TRIGGER IF EXISTS "trg_consentimento_responsavel_sem_truncate" ON "consentimento_responsavel"';
  EXECUTE 'CREATE TRIGGER "trg_consentimento_responsavel_sem_truncate" BEFORE TRUNCATE ON "consentimento_responsavel" '
          'FOR EACH STATEMENT EXECUTE FUNCTION "impede_alteracao_historico"()';
END $$;

ALTER TABLE "convite_responsavel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consentimento_responsavel" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_convite_responsavel_leitura" ON "convite_responsavel";
CREATE POLICY "p_convite_responsavel_leitura" ON "convite_responsavel" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin()
);

DROP POLICY IF EXISTS "p_consentimento_responsavel_leitura" ON "consentimento_responsavel";
CREATE POLICY "p_consentimento_responsavel_leitura" ON "consentimento_responsavel" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin()
  OR (usuario_id = auth_current_usuario_id())
);

-- Sem política de escrita: quem escreve é a API com service role. O REVOKE
-- reforça isso mesmo que alguém crie uma política de escrita por engano.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "convite_responsavel", '
        '"consentimento_responsavel" FROM %I', r);
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. O responsável só lê o aluno com consentimento, e pela view
-- ─────────────────────────────────────────────────────────────────────────────
-- Cadastros de aluno a que o responsável logado está ligado E para os quais
-- ele deu consentimento (da mesma conta: o consentimento de outra pessoa não vale).
CREATE OR REPLACE FUNCTION auth_alunos_do_responsavel() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.aluno_instituicao_id FROM responsavel_aluno r
    JOIN usuario u ON u.id = r.usuario_id
    JOIN consentimento_responsavel c
      ON c.responsavel_aluno_id = r.id
     AND c.instituicao_id = r.instituicao_id
     AND c.usuario_id = r.usuario_id
   WHERE u.auth_uid = auth.uid() AND u.tipo_perfil = 'responsavel'
$$;

-- O responsável deixa de ler a tabela do aluno (que tem data de nascimento e
-- e-mail): a cláusula dele sai da política.
DROP POLICY IF EXISTS "p_aluno_instituicao_leitura" ON "aluno_instituicao";
CREATE POLICY "p_aluno_instituicao_leitura" ON "aluno_instituicao" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin()
  OR turma_id IN (SELECT auth_turmas_professor())
  OR (usuario_id IS NOT NULL AND usuario_id = auth_current_usuario_id())
);

-- O que a família vê do aluno: sem data_nascimento, sem e-mail, sem usuario_id.
-- A view roda com o dono (que ignora a RLS da tabela) e filtra pelo helper, que
-- lê auth.uid() da sessão de quem consulta.
CREATE OR REPLACE VIEW "aluno_do_responsavel" WITH (security_barrier = true) AS
  SELECT a.id, a.instituicao_id, a.matricula, a.nome, a.turma_id
    FROM aluno_instituicao a
   WHERE a.id IN (SELECT auth_alunos_do_responsavel());

-- View simples é atualizável: sem este REVOKE, um UPDATE na view furaria a RLS.
DO $$
DECLARE r text;
BEGIN
  REVOKE ALL ON "aluno_do_responsavel" FROM PUBLIC;
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON "aluno_do_responsavel" FROM %I', r);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT ON "aluno_do_responsavel" TO authenticated;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Vínculos feitos por e-mail antes do convite
-- ─────────────────────────────────────────────────────────────────────────────
-- A importação casava o responsável com qualquer conta de mesmo e-mail, sem
-- consentimento. Esses vínculos não têm base: cada responsável volta a ligar a
-- conta pelo convite.
UPDATE "responsavel_aluno" SET "usuario_id" = NULL
  WHERE "usuario_id" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "consentimento_responsavel" c WHERE c."responsavel_aluno_id" = "responsavel_aluno"."id"
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. audit_log sem dado pessoal
-- ─────────────────────────────────────────────────────────────────────────────
-- Versões anteriores gravavam e-mail, matrícula e o registro anterior do
-- responsável em `dados`. O audit_log é só de inserção, então esse dado não
-- saía mais. O bloqueio geral NÃO é afrouxado: o trigger de audit_log passa a
-- aceitar UM caso, e só ele:
--   - UPDATE (nunca DELETE nem TRUNCATE),
--   - só quando a função anonimizar_pii_audit_log() ligou o GUC local
--     `notaa.anonimizando` (o GUC vale só dentro da transação dela),
--   - só em responsavel.vinculado e responsavel.atualizado,
--   - só a coluna `dados` muda; qualquer outra coluna igual.
-- Risco residual: quem executa SQL como superusuário e liga o GUC à mão pode
-- reescrever `dados` dessas duas ações. Nenhuma outra coluna, nenhuma outra
-- ação, e o histórico de quem fez o quê continua inalterável.
CREATE OR REPLACE FUNCTION "impede_alteracao_audit_log"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND current_setting('notaa.anonimizando', true) = 'on'
     AND OLD.acao IN ('responsavel.vinculado', 'responsavel.atualizado')
     AND (to_jsonb(NEW) - 'dados') = (to_jsonb(OLD) - 'dados')
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'A tabela % é só de inserção: % não é permitido.', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

DROP TRIGGER IF EXISTS "trg_audit_log_imutavel" ON "audit_log";
CREATE TRIGGER "trg_audit_log_imutavel" BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION "impede_alteracao_audit_log"();

-- Tira de `dados` o que identifica uma pessoa e registra a execução (só a
-- contagem). Idempotente: sem nada a limpar, não muda nem registra nada.
CREATE OR REPLACE FUNCTION "anonimizar_pii_audit_log"() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('notaa.anonimizando', 'on', true);
  UPDATE audit_log
     SET dados = dados - 'email' - 'matricula' - 'antes' - 'usuarioId' - 'nome' - 'telefone'
   WHERE acao IN ('responsavel.vinculado', 'responsavel.atualizado')
     AND dados ?| ARRAY['email', 'matricula', 'antes', 'usuarioId', 'nome', 'telefone'];
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('notaa.anonimizando', 'off', true);
  IF n > 0 THEN
    INSERT INTO audit_log (acao, entidade, dados)
      VALUES ('audit_log.anonimizado', 'audit_log', jsonb_build_object('linhas', n));
  END IF;
  RETURN n;
END $$;

DO $$
BEGIN
  REVOKE ALL ON FUNCTION "anonimizar_pii_audit_log"() FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION "anonimizar_pii_audit_log"() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION "anonimizar_pii_audit_log"() FROM authenticated;
  END IF;
END $$;

-- Limpa o que as versões antigas deixaram (ambientes de desenvolvimento).
SELECT "anonimizar_pii_audit_log"();
