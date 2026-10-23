-- Quiz: registra quais itens cada sessão serviu ao aluno.
--
-- Sem esta tabela, POST /quiz/sessions/:id/answers aceitava qualquer itemId de
-- banco_de_itens e devolvia o gabarito dele (`gabarito` na resposta). Com ela, a
-- resposta só é aceita para item servido àquela sessão e ainda não respondido.
--
-- Escrita à mão, idempotente, no estilo da 0010–0015. Não entra em
-- meta/_journal.json, como as 0010–0014; o próximo `db:generate` regenera o
-- snapshot (descartar o SQL que o drizzle-kit gerar, como na 0015).
--
-- Numeração: 0016–0019 são de PRs abertos. 0020 fica reservada para a
-- invalidação de respostas (proposta fora do repositório).
--
-- RLS: só a API (service role) lê e escreve. Sem policy e sem privilégio para
-- anon/authenticated.

CREATE TABLE IF NOT EXISTS "quiz_item_servido" (
  "sessao_id" uuid NOT NULL,
  "item_id"   uuid NOT NULL,
  "ordem"     integer NOT NULL,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "quiz_item_servido_pk" PRIMARY KEY ("sessao_id", "item_id")
);

DO $$ BEGIN
  ALTER TABLE "quiz_item_servido"
    ADD CONSTRAINT "quiz_item_servido_sessao_id_sessao_avaliativa_id_fk"
    FOREIGN KEY ("sessao_id") REFERENCES "public"."sessao_avaliativa"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "quiz_item_servido"
    ADD CONSTRAINT "quiz_item_servido_item_id_banco_de_itens_id_fk"
    FOREIGN KEY ("item_id") REFERENCES "public"."banco_de_itens"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "quiz_item_servido" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "quiz_item_servido" FROM anon, authenticated;
