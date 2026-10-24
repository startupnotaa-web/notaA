-- Aplicação manual das migrações 0016, 0017 e 0018 no projeto notaa (Supabase).
-- Gerado em 2026-10-23 a partir de supabase/migrations/0016_*.sql, 0017_*.sql e 0018_*.sql, na ordem.
--
-- COMO USAR (SQL Editor do Supabase):
--   1. Cole o arquivo inteiro e rode COMO ESTÁ. Termina em ROLLBACK: nada fica gravado.
--      Sem erro = todas as conferências abaixo passaram.
--   2. Só então troque a última linha: apague "rollback;" e descomente "commit;". Rode de novo.
--   3. Depois do commit, rode sozinho o bloco "RELATÓRIO" (fim do arquivo) para ver os números.
--
-- O QUE FAZ: cria convite_responsavel, consentimento_responsavel, solicitacao_vinculo_responsavel,
--   lead_landing e lead_rate_limit (todas com RLS ligada), a view aluno_do_responsavel e as funções
--   auth_usuario_ativo_id e anonimizar_pii_audit_log; troca funções de RLS (agora só usuário ativo),
--   políticas de leitura de aluno_instituicao e responsavel_aluno e o trigger de audit_log; revoga
--   escrita de anon/authenticated nas tabelas da Gestão Acadêmica.
-- DADO: o único efeito sobre linhas existentes é (a) desligar de responsavel_aluno.usuario_id os
--   vínculos sem consentimento e (b) tirar PII de audit_log.dados de 2 ações. Em produção, em
--   2026-10-23, as duas contagens eram 0 (conferido por consulta de leitura). As conferências abaixo
--   mostram quantas linhas isso tocaria e abortam se algo fora do esperado mudar.
-- SEM DROP, DELETE nem TRUNCATE como comando: onde a migração original trocava uma política ou um
--   trigger com DROP + CREATE, aqui usa ALTER POLICY e CREATE OR REPLACE TRIGGER (Postgres 14+; o
--   projeto roda 17). Idempotente: pode rodar duas vezes.
-- PRÉ-REQUISITO: 0015 aplicada (responsavel_aluno, aluno_instituicao, audit_log, usuario.funcao_instituicao).

begin;

-- Fotografia das contagens, para provar no fim que nenhuma linha sumiu.
select set_config('notaa.apl.usuario', (select count(*) from public.usuario)::text, true),
       set_config('notaa.apl.resp_aluno', (select count(*) from public.responsavel_aluno)::text, true),
       set_config('notaa.apl.aluno_inst', (select count(*) from public.aluno_instituicao)::text, true),
       set_config('notaa.apl.audit', (select count(*) from public.audit_log)::text, true);

do $$
begin
  if to_regclass('public.responsavel_aluno') is null
     or to_regclass('public.aluno_instituicao') is null
     or to_regclass('public.audit_log') is null
     or to_regprocedure('public.impede_alteracao_historico()') is null
     or not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'usuario' and column_name = 'funcao_instituicao')
  then
    raise exception 'aplique antes a migração 0015_gestao_academica.sql';
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 0016_seguranca_gestao_academica
-- ═════════════════════════════════════════════════════════════════════════════

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
-- 3. Função padrão do admin de instituição: coordenação, não gestor.
-- 4. REVOKE de escrita nas tabelas comuns da 0015.
-- 5. Só usuário ativo lê: suspenso e pendente deixam de passar pelas funções de RLS.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Funções de RLS: só usuário ATIVO
-- ─────────────────────────────────────────────────────────────────────────────
-- As funções da 0015 resolviam instituição e vínculos sem olhar `usuario.status`:
-- quem foi suspenso (ou ainda está pendente) continuava lendo, por RLS, até o
-- token expirar. Agora todas exigem status = 'ativo'. Mesma assinatura, então as
-- políticas não mudam. (auth_instituicao_gestor e auth_alunos_do_responsavel são
-- redefinidas mais abaixo, já com a checagem.)
-- `auth_current_usuario_id()` NÃO muda aqui: é compartilhada com as políticas das
-- tabelas anteriores (supabase/policies/0001) e reaplicar aquele arquivo
-- desfaria a mudança. As tabelas novas usam auth_usuario_ativo_id().
CREATE OR REPLACE FUNCTION auth_usuario_ativo_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM usuario WHERE auth_uid = auth.uid() AND status = 'ativo'
$$;

CREATE OR REPLACE FUNCTION auth_instituicao_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT instituicao_id FROM usuario
   WHERE auth_uid = auth.uid()
     AND status = 'ativo'
     AND tipo_perfil IN ('admin_instituicao', 'professor_institucional')
$$;

CREATE OR REPLACE FUNCTION auth_instituicao_admin() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT instituicao_id FROM usuario
   WHERE auth_uid = auth.uid() AND status = 'ativo' AND tipo_perfil = 'admin_instituicao'
$$;

CREATE OR REPLACE FUNCTION auth_turmas_professor() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pt.turma_id FROM professor_turma pt
    JOIN usuario u ON u.id = pt.professor_id
   WHERE u.auth_uid = auth.uid() AND u.status = 'ativo' AND u.tipo_perfil = 'professor_institucional'
$$;

CREATE OR REPLACE FUNCTION auth_instituicoes_aluno() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT t.instituicao_id FROM matricula_turma m
    JOIN turma t ON t.id = m.turma_id
    JOIN usuario u ON u.id = m.estudante_id
   WHERE u.auth_uid = auth.uid()
     AND u.status = 'ativo'
     AND u.tipo_perfil = 'estudante'
     AND m.status = 'ativa'
     AND t.instituicao_id IS NOT NULL
$$;

DO $$
BEGIN
  REVOKE ALL ON FUNCTION auth_usuario_ativo_id() FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION auth_usuario_ativo_id() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION auth_usuario_ativo_id() TO authenticated;
  END IF;
END $$;

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
  EXECUTE 'CREATE OR REPLACE TRIGGER "trg_consentimento_responsavel_imutavel" BEFORE UPDATE OR DELETE ON "consentimento_responsavel" '
          'FOR EACH ROW EXECUTE FUNCTION "impede_alteracao_historico"()';
  EXECUTE 'CREATE OR REPLACE TRIGGER "trg_consentimento_responsavel_sem_truncate" BEFORE TRUNCATE ON "consentimento_responsavel" '
          'FOR EACH STATEMENT EXECUTE FUNCTION "impede_alteracao_historico"()';
END $$;

ALTER TABLE "convite_responsavel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consentimento_responsavel" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'convite_responsavel' AND policyname = 'p_convite_responsavel_leitura') THEN
    ALTER POLICY "p_convite_responsavel_leitura" ON "convite_responsavel" USING (
  instituicao_id = auth_instituicao_admin());
  ELSE
    CREATE POLICY "p_convite_responsavel_leitura" ON "convite_responsavel" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consentimento_responsavel' AND policyname = 'p_consentimento_responsavel_leitura') THEN
    ALTER POLICY "p_consentimento_responsavel_leitura" ON "consentimento_responsavel" USING (
  instituicao_id = auth_instituicao_admin()
  OR (usuario_id = auth_usuario_ativo_id()));
  ELSE
    CREATE POLICY "p_consentimento_responsavel_leitura" ON "consentimento_responsavel" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin()
  OR (usuario_id = auth_usuario_ativo_id()));
  END IF;
END $$;

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
   WHERE u.auth_uid = auth.uid() AND u.status = 'ativo' AND u.tipo_perfil = 'responsavel'
$$;

-- O responsável deixa de ler a tabela do aluno (que tem data de nascimento e
-- e-mail): a cláusula dele sai da política.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'aluno_instituicao' AND policyname = 'p_aluno_instituicao_leitura') THEN
    ALTER POLICY "p_aluno_instituicao_leitura" ON "aluno_instituicao" USING (
  instituicao_id = auth_instituicao_admin()
  OR turma_id IN (SELECT auth_turmas_professor())
  OR (usuario_id IS NOT NULL AND usuario_id = auth_usuario_ativo_id()));
  ELSE
    CREATE POLICY "p_aluno_instituicao_leitura" ON "aluno_instituicao" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin()
  OR turma_id IN (SELECT auth_turmas_professor())
  OR (usuario_id IS NOT NULL AND usuario_id = auth_usuario_ativo_id()));
  END IF;
END $$;

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

CREATE OR REPLACE TRIGGER "trg_audit_log_imutavel" BEFORE UPDATE OR DELETE ON "audit_log"
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Função padrão: coordenação
-- ─────────────────────────────────────────────────────────────────────────────
-- Admin de instituição sem função gravada era tratado como gestor, a função mais
-- privilegiada (exporta dados e lê a auditoria). Um fluxo futuro que esquecesse
-- de gravar a função criaria um gestor. Agora o padrão é o menos privilegiado, e
-- gestor só existe quando gravado de propósito (instituicao.repository grava
-- 'gestor' para quem cria a instituição; a 0015 já gravou para os existentes).
CREATE OR REPLACE FUNCTION auth_instituicao_gestor() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT instituicao_id FROM usuario
   WHERE auth_uid = auth.uid()
     AND status = 'ativo'
     AND tipo_perfil = 'admin_instituicao'
     AND coalesce(funcao_instituicao, 'coordenacao') = 'gestor'
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Sem escrita direta nas tabelas comuns
-- ─────────────────────────────────────────────────────────────────────────────
-- A 0015 revogou escrita só nas três tabelas de histórico; nas outras a única
-- barreira era a ausência de política de escrita. Uma política criada por engano
-- abriria a escrita. Agora o privilégio também não existe: quem escreve é a API
-- com service role.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "periodo_avaliativo", "disciplina", '
        '"turma_disciplina", "aluno_instituicao", "responsavel_aluno", "importacao" FROM %I', r);
    END IF;
  END LOOP;
END $$;

-- A política do próprio responsável (0015) usava auth_current_usuario_id(), que
-- não olha o status.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'responsavel_aluno' AND policyname = 'p_responsavel_aluno_leitura') THEN
    ALTER POLICY "p_responsavel_aluno_leitura" ON "responsavel_aluno" USING (
  instituicao_id = auth_instituicao_admin()
  OR (usuario_id IS NOT NULL AND usuario_id = auth_usuario_ativo_id()));
  ELSE
    CREATE POLICY "p_responsavel_aluno_leitura" ON "responsavel_aluno" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin()
  OR (usuario_id IS NOT NULL AND usuario_id = auth_usuario_ativo_id()));
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 0017_vinculo_responsavel_pendente
-- ═════════════════════════════════════════════════════════════════════════════

-- Vínculo de responsável: e-mail diferente do cadastro não vincula, fica à espera
-- da coordenação.
--
-- O convite (0016) liga a conta ao contato pelo token. Quem recebe o link por
-- outro canal e tem uma conta de responsável passaria a ler o aluno. Agora o
-- aceite só vincula se o e-mail da conta autenticada (claim do token, não o
-- `usuario.email`, que o cadastro grava sem prova de posse) for o do contato.
-- Se diferir, a API grava uma solicitação `pendente_aprovacao` aqui e a coordenação
-- aprova ou recusa. Pendente NÃO abre leitura nenhuma: o contato segue sem
-- `usuario_id` e sem consentimento, que são o que `auth_alunos_do_responsavel()` exige.
--
-- Pré-requisito fora do banco: o projeto Supabase precisa exigir confirmação de
-- e-mail (Authentication → Providers → Email → "Confirm email"). Sem isso o claim
-- de e-mail é só o que a pessoa digitou.

CREATE TABLE IF NOT EXISTS "solicitacao_vinculo_responsavel" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instituicao_id" uuid NOT NULL REFERENCES "instituicao"("id") ON DELETE restrict,
  "responsavel_aluno_id" uuid NOT NULL,
  "convite_id" uuid NOT NULL,
  -- Conta que usou o convite. O consentimento é DELA: fica guardado aqui e só vira
  -- linha em consentimento_responsavel quando a coordenação aprova.
  "usuario_id" uuid NOT NULL REFERENCES "usuario"("id") ON DELETE restrict,
  "versao_termo" text NOT NULL,
  -- E-mail da conta, para a coordenação decidir. Apagado ao decidir.
  "email_conta" text,
  "status" text DEFAULT 'pendente_aprovacao' NOT NULL,
  "decidido_por" uuid REFERENCES "usuario"("id") ON DELETE restrict,
  "decidido_em" timestamp with time zone,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ck_solicitacao_vinculo_status"
    CHECK ("status" IN ('pendente_aprovacao', 'aprovada', 'recusada', 'cancelada')),
  CONSTRAINT "ck_solicitacao_vinculo_decisao"
    CHECK (("status" = 'pendente_aprovacao') = ("decidido_em" IS NULL)),
  CONSTRAINT "solicitacao_vinculo_responsavel_responsavel_escopo_fk"
    FOREIGN KEY ("responsavel_aluno_id", "instituicao_id")
    REFERENCES "responsavel_aluno"("id", "instituicao_id") ON DELETE cascade,
  CONSTRAINT "solicitacao_vinculo_responsavel_convite_escopo_fk"
    FOREIGN KEY ("convite_id", "instituicao_id")
    REFERENCES "convite_responsavel"("id", "instituicao_id") ON DELETE cascade
);

-- Uma pendência aberta por contato.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_solicitacao_vinculo_pendente"
  ON "solicitacao_vinculo_responsavel" ("responsavel_aluno_id")
  WHERE "status" = 'pendente_aprovacao';
CREATE INDEX IF NOT EXISTS "idx_solicitacao_vinculo_instituicao"
  ON "solicitacao_vinculo_responsavel" ("instituicao_id", "status");

ALTER TABLE "solicitacao_vinculo_responsavel" ENABLE ROW LEVEL SECURITY;

-- Só a administração da instituição lê. Quem fez a tentativa NÃO lê a própria
-- linha: saber que virou pendência quebraria a resposta idêntica a "convite inválido".
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'solicitacao_vinculo_responsavel' AND policyname = 'p_solicitacao_vinculo_leitura') THEN
    ALTER POLICY "p_solicitacao_vinculo_leitura" ON "solicitacao_vinculo_responsavel" USING (
  instituicao_id = auth_instituicao_admin());
  ELSE
    CREATE POLICY "p_solicitacao_vinculo_leitura" ON "solicitacao_vinculo_responsavel" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin());
  END IF;
END $$;

-- Sem política de escrita: quem escreve é a API com service role. O REVOKE reforça.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "solicitacao_vinculo_responsavel" FROM %I', r);
    END IF;
  END LOOP;
END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 0018_lead_landing
-- ═════════════════════════════════════════════════════════════════════════════

-- Landing pública: leads de contato, demonstração e lista de espera (2026-10-19).
--
-- Escrita à mão, idempotente, no estilo da 0016. O snapshot em
-- meta/0018_snapshot.json vem de `drizzle-kit generate` a partir do schema TS
-- (packages/db/src/schema/lead.ts); o SQL que o drizzle-kit gerou foi descartado
-- porque ele não conhece o ENABLE ROW LEVEL SECURITY nem os REVOKEs daqui.
--
-- Quem grava: só a API (conexão service role), em POST /leads.
-- Quem lê: só quem tem acesso ao banco (painel do Supabase). Nenhuma tela do
-- produto lê estas tabelas, e não existe política de leitura para anon nem para
-- authenticated: RLS ligada e SEM política = negado por padrão, o mesmo critério
-- das tabelas só-service-role de supabase/policies/0003.
--
-- Prazo de retenção dos leads: a definir com o jurídico e registrar em /privacidade
-- antes de abrir a landing ao público.

CREATE TABLE IF NOT EXISTS lead_landing (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem           text NOT NULL,
  nome             text NOT NULL,
  email            text NOT NULL,
  organizacao      text,
  perfil           text,
  consentimento_em timestamptz NOT NULL DEFAULT now(),
  versao_politica  text NOT NULL,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_lead_landing_origem CHECK (origem IN ('contato', 'demo', 'espera')),
  CONSTRAINT ck_lead_landing_perfil CHECK (perfil IS NULL OR perfil IN ('aluno', 'professor', 'gestor', 'faculdade')),
  CONSTRAINT uq_lead_landing_origem_email UNIQUE (origem, email)
);

CREATE INDEX IF NOT EXISTS idx_lead_landing_criado_em ON lead_landing (criado_em);

-- Contador do limite de envios. `chave_hash` é HMAC do IP com segredo da API: o IP não é gravado.
CREATE TABLE IF NOT EXISTS lead_rate_limit (
  chave_hash     text NOT NULL,
  janela_inicio  timestamptz NOT NULL,
  contagem       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (chave_hash, janela_inicio)
);

CREATE INDEX IF NOT EXISTS idx_lead_rate_limit_janela ON lead_rate_limit (janela_inicio);

-- RLS ligada, sem política: anon e authenticated não leem nem escrevem.
ALTER TABLE lead_landing ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_rate_limit ENABLE ROW LEVEL SECURITY;

-- Defesa em profundidade: o privilégio some mesmo que alguém crie uma política depois.
-- O Supabase dá ALL nas tabelas novas a anon e authenticated por padrão; aqui é retirado.
REVOKE ALL ON lead_landing FROM anon, authenticated;
REVOKE ALL ON lead_rate_limit FROM anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- CONFERÊNCIAS (qualquer falha aborta a transação)
-- ═════════════════════════════════════════════════════════════════════════════
do $$
declare
  t text; f text; falta text[] := '{}'; n bigint; r text;
begin
  -- tabelas novas existem e têm RLS ligada
  foreach t in array array['convite_responsavel','consentimento_responsavel','solicitacao_vinculo_responsavel','lead_landing','lead_rate_limit'] loop
    if to_regclass('public.' || t) is null then falta := falta || (t || ' (não existe)');
    elsif not (select relrowsecurity from pg_class where oid = to_regclass('public.' || t)) then falta := falta || (t || ' (RLS desligada)');
    end if;
  end loop;
  if to_regclass('public.aluno_do_responsavel') is null then falta := falta || 'aluno_do_responsavel (view)'; end if;
  foreach f in array array['auth_usuario_ativo_id()','anonimizar_pii_audit_log()','auth_alunos_do_responsavel()','auth_instituicao_gestor()'] loop
    if to_regprocedure('public.' || f) is null then falta := falta || (f || ' (função)'); end if;
  end loop;

  -- políticas esperadas
  foreach t in array array['p_convite_responsavel_leitura','p_consentimento_responsavel_leitura','p_solicitacao_vinculo_leitura','p_aluno_instituicao_leitura','p_responsavel_aluno_leitura'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and policyname = t) then falta := falta || (t || ' (política)'); end if;
  end loop;
  -- o responsável não lê mais aluno_instituicao direto; responsavel_aluno usa o helper de usuário ativo
  if exists (select 1 from pg_policies where schemaname = 'public' and policyname = 'p_aluno_instituicao_leitura' and qual like '%auth_alunos_do_responsavel%') then
    falta := falta || 'p_aluno_instituicao_leitura ainda lê pelo responsável';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and policyname = 'p_responsavel_aluno_leitura' and qual like '%auth_usuario_ativo_id%') then
    falta := falta || 'p_responsavel_aluno_leitura sem auth_usuario_ativo_id';
  end if;
  -- só uma política por nome (nada duplicado)
  select count(*) into n from (select policyname, tablename from pg_policies where schemaname = 'public'
    and policyname in ('p_aluno_instituicao_leitura','p_responsavel_aluno_leitura') group by 1,2 having count(*) > 1) d;
  if n > 0 then falta := falta || 'política duplicada'; end if;

  -- triggers de imutabilidade
  foreach t in array array['trg_audit_log_imutavel','trg_consentimento_responsavel_imutavel','trg_consentimento_responsavel_sem_truncate'] loop
    if not exists (select 1 from pg_trigger where tgname = t and not tgisinternal) then falta := falta || (t || ' (trigger)'); end if;
  end loop;

  -- anon e authenticated sem acesso às tabelas fechadas
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      foreach t in array array['lead_landing','lead_rate_limit','convite_responsavel','consentimento_responsavel','solicitacao_vinculo_responsavel'] loop
        if has_table_privilege(r, 'public.' || t, 'INSERT') or has_table_privilege(r, 'public.' || t, 'UPDATE')
           or has_table_privilege(r, 'public.' || t, 'DELETE') or has_table_privilege(r, 'public.' || t, 'TRUNCATE') then
          falta := falta || (r || ' ainda escreve em ' || t);
        end if;
      end loop;
      foreach t in array array['lead_landing','lead_rate_limit'] loop
        if has_table_privilege(r, 'public.' || t, 'SELECT') then falta := falta || (r || ' ainda lê ' || t); end if;
      end loop;
      if has_table_privilege(r, 'public.aluno_do_responsavel', 'INSERT') or has_table_privilege(r, 'public.aluno_do_responsavel', 'UPDATE')
         or has_table_privilege(r, 'public.aluno_do_responsavel', 'DELETE') then
        falta := falta || (r || ' escreve na view aluno_do_responsavel');
      end if;
    end if;
  end loop;

  -- nenhum PII restante no audit_log e nenhuma linha perdida
  select count(*) into n from public.audit_log
   where acao in ('responsavel.vinculado','responsavel.atualizado')
     and dados ?| array['email','matricula','antes','usuarioId','nome','telefone'];
  if n > 0 then falta := falta || (n || ' linhas de audit_log ainda com PII'); end if;
  if (select count(*) from public.usuario) <> current_setting('notaa.apl.usuario')::bigint then falta := falta || 'usuario mudou de contagem'; end if;
  if (select count(*) from public.responsavel_aluno) <> current_setting('notaa.apl.resp_aluno')::bigint then falta := falta || 'responsavel_aluno mudou de contagem'; end if;
  if (select count(*) from public.aluno_instituicao) <> current_setting('notaa.apl.aluno_inst')::bigint then falta := falta || 'aluno_instituicao mudou de contagem'; end if;
  -- audit_log só cresce: no máximo +1 (a linha 'audit_log.anonimizado')
  n := (select count(*) from public.audit_log) - current_setting('notaa.apl.audit')::bigint;
  if n < 0 or n > 1 then falta := falta || ('audit_log variou ' || n || ' linhas'); end if;

  if array_length(falta, 1) is not null then
    raise exception 'conferência falhou: %', array_to_string(falta, '; ');
  end if;
end $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- RELATÓRIO (rode sozinho depois do commit; o editor só mostra o último resultado)
-- ═════════════════════════════════════════════════════════════════════════════
select * from (
  select 1 as o, 'tabela ' || c.relname as item, 'RLS=' || c.relrowsecurity::text as valor
    from pg_class c where c.relnamespace = 'public'::regnamespace
     and c.relname in ('convite_responsavel','consentimento_responsavel','solicitacao_vinculo_responsavel','lead_landing','lead_rate_limit')
  union all select 2, 'linhas em ' || t, (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.' || t, false, true, '')))[1]::text
    from unnest(array['convite_responsavel','consentimento_responsavel','solicitacao_vinculo_responsavel','lead_landing','lead_rate_limit']) t
  union all select 3, 'view aluno_do_responsavel', coalesce(to_regclass('public.aluno_do_responsavel')::text, 'AUSENTE')
  union all select 4, 'responsavel_aluno total / com usuario_id', (select count(*) from public.responsavel_aluno)::text || ' / ' || (select count(*) from public.responsavel_aluno where usuario_id is not null)::text
  union all select 5, 'audit_log total / com PII restante', (select count(*) from public.audit_log)::text || ' / ' ||
       (select count(*) from public.audit_log where acao in ('responsavel.vinculado','responsavel.atualizado') and dados ?| array['email','matricula','antes','usuarioId','nome','telefone'])::text
  union all select 6, 'usuario total', (select count(*) from public.usuario)::text
  union all select 7, 'políticas novas', (select count(*) from pg_policies where schemaname = 'public' and policyname in
       ('p_convite_responsavel_leitura','p_consentimento_responsavel_leitura','p_solicitacao_vinculo_leitura','p_aluno_instituicao_leitura','p_responsavel_aluno_leitura'))::text || ' de 5'
) x order by o, item;

rollback;  -- trocar pelo COMMIT abaixo só depois de rodar uma vez e não ver erro
-- commit;  -- descomentar e apagar o rollback acima somente depois da primeira rodada sem erro
