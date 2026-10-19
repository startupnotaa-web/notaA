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
DROP POLICY IF EXISTS "p_solicitacao_vinculo_leitura" ON "solicitacao_vinculo_responsavel";
CREATE POLICY "p_solicitacao_vinculo_leitura" ON "solicitacao_vinculo_responsavel" FOR SELECT USING (
  instituicao_id = auth_instituicao_admin()
);

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
