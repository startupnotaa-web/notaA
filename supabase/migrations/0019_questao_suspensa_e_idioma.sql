-- Questões fora do ar e idioma dos itens de língua estrangeira.
--
-- 1. `questao_suspensa`: tabela lateral com as questões que NÃO podem ser
--    servidas ao aluno (suspensa, anulada ou arquivada). Não altera
--    `questoes_enem`. É transitória: sai de cena quando o estado de revisão
--    (rascunho / em revisão / aprovada / reprovada / arquivada) entrar no modelo.
-- 2. `questoes_enem.idioma`: marca os itens de língua estrangeira (1–5 de
--    Linguagens, Dia 1). NULL = questão comum. O simulado serve cada versão só a
--    quem escolheu aquele idioma.
--
-- Esta migração só cria estrutura. Quais questões ficam suspensas e quais itens
-- são de inglês ou espanhol é DADO e está em supabase/correcoes/ (revisado e
-- aplicado à mão). Sem as linhas de dados, nada muda no comportamento do banco.
--
-- ORDEM DE IMPLANTAÇÃO: aplicar esta migração ANTES de publicar a API que a usa.
-- A API passa a consultar `questao_suspensa` e `questoes_enem.idioma`; sem elas,
-- a montagem do simulado falha (de propósito: falhar é melhor que servir questão
-- suspensa).
--
-- Numeração: 0016–0018 já estão reservadas por PRs em andamento
-- (0016_seguranca_gestao_academica, 0017_vinculo_responsavel_pendente,
-- 0018_lead_landing). Escrita à mão, idempotente, no estilo da 0015. Como
-- 0010–0014, não traz entrada em meta/_journal.json; o próximo `db:generate`,
-- depois que essas migrações entrarem, regenera o snapshot (descartar o SQL que
-- o drizzle-kit gerar, como na 0015).
--
-- RLS: `questao_suspensa` é só da API (service role): RLS ligada, sem policy, e
-- sem privilégio algum para `anon` e `authenticated`.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Idioma dos itens de língua estrangeira
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "idioma_estrangeiro" AS ENUM ('ingles', 'espanhol');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "questoes_enem" ADD COLUMN IF NOT EXISTS "idioma" "idioma_estrangeiro";

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Questões que não podem ser servidas
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "questao_suspensa" (
  "questao_id" uuid PRIMARY KEY NOT NULL,
  "situacao"   text NOT NULL DEFAULT 'suspensa',
  "motivos"    text[] NOT NULL,
  "origem"     text NOT NULL DEFAULT 'manual',
  "criada_em"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ck_questao_suspensa_situacao" CHECK ("situacao" IN ('suspensa', 'anulada', 'arquivada'))
);

DO $$ BEGIN
  ALTER TABLE "questao_suspensa"
    ADD CONSTRAINT "questao_suspensa_questao_id_questoes_enem_id_fk"
    FOREIGN KEY ("questao_id") REFERENCES "public"."questoes_enem"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "questao_suspensa" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "questao_suspensa" FROM anon, authenticated;
