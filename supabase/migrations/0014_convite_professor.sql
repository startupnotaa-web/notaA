-- Convite de professor institucional (perfis.md).
--
-- O professor institucional não se auto-cadastra: a instituição gera um convite
-- e ele cria a conta a partir dele. A entrega é por LINK gerado na tela, sem
-- dependência de e-mail transacional (decisão do usuário).
--
-- O token é uma credencial: quem tem o link entra na instituição. Por isso tem
-- prazo (`expira_em`), é queimado no primeiro uso (`usado_em`) e pode ser
-- revogado antes disso (`revogado_em`). O prazo em si é escolha de engenharia,
-- não está em perfis.md.
--
-- `email` é apenas registro de para quem o convite foi feito; quem autoriza é o
-- token. Deixar o e-mail nulo é válido para um link passado em mãos.

CREATE TABLE IF NOT EXISTS "convite_professor" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instituicao_id" uuid NOT NULL,
  "token" text NOT NULL,
  "email" citext,
  "criado_por" uuid NOT NULL,
  "expira_em" timestamp with time zone NOT NULL,
  "usado_em" timestamp with time zone,
  "usado_por" uuid,
  "revogado_em" timestamp with time zone,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "convite_professor_token_unique" UNIQUE ("token")
);

ALTER TABLE "convite_professor"
  ADD CONSTRAINT "convite_professor_instituicao_id_instituicao_id_fk"
  FOREIGN KEY ("instituicao_id") REFERENCES "instituicao"("id") ON DELETE cascade;
ALTER TABLE "convite_professor"
  ADD CONSTRAINT "convite_professor_criado_por_usuario_id_fk"
  FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") ON DELETE restrict;
ALTER TABLE "convite_professor"
  ADD CONSTRAINT "convite_professor_usado_por_usuario_id_fk"
  FOREIGN KEY ("usado_por") REFERENCES "usuario"("id") ON DELETE restrict;

CREATE INDEX IF NOT EXISTS "idx_convite_professor_instituicao"
  ON "convite_professor" ("instituicao_id");
CREATE INDEX IF NOT EXISTS "idx_convite_professor_expira"
  ON "convite_professor" ("expira_em");
