-- Estrutura de instituições, turmas, professores e ano letivo.
-- Decisões em perfis.md + perfis-decisoes.md.
--
-- Seguro de rodar: turma e matricula_turma estão VAZIAS em produção (verificado),
-- e nenhum usuário tem papel 'professor'. Por isso dá para adicionar colunas
-- NOT NULL e trocar valor de enum sem backfill.
--
-- Escrita à mão. `drizzle-kit generate` resolveria parte disto como drop/create.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Papéis: 'professor' se divide em institucional e independente
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TYPE "tipo_perfil" RENAME VALUE 'professor' TO 'professor_institucional';
ALTER TYPE "tipo_perfil" ADD VALUE IF NOT EXISTS 'professor_independente';

-- Estado da solicitação de entrada do aluno na turma.
DO $$ BEGIN
  CREATE TYPE "matricula_status" AS ENUM ('pendente', 'ativa', 'recusada', 'removida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Ano letivo: rótulo global da plataforma
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ano_letivo" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rotulo" text NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ano_letivo_rotulo_unique" UNIQUE ("rotulo")
);

-- Datas e arquivamento do ano, POR DONO: o calendário é de cada instituição.
-- Duas colunas de dono, só uma preenchida — mesmo padrão de `assinatura`.
CREATE TABLE IF NOT EXISTS "ano_letivo_periodo" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ano_letivo_id" uuid NOT NULL,
  "instituicao_id" uuid,
  "professor_dono_id" uuid,
  "data_inicio" date,
  "data_fim" date,
  "arquivado" boolean DEFAULT false NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uq_periodo_ano_instituicao" UNIQUE ("ano_letivo_id", "instituicao_id"),
  CONSTRAINT "uq_periodo_ano_professor" UNIQUE ("ano_letivo_id", "professor_dono_id"),
  CONSTRAINT "ck_periodo_dono_unico" CHECK (
    ("instituicao_id" IS NOT NULL AND "professor_dono_id" IS NULL)
    OR ("instituicao_id" IS NULL AND "professor_dono_id" IS NOT NULL)
  )
);

ALTER TABLE "ano_letivo_periodo"
  ADD CONSTRAINT "ano_letivo_periodo_ano_letivo_id_ano_letivo_id_fk"
  FOREIGN KEY ("ano_letivo_id") REFERENCES "ano_letivo"("id") ON DELETE restrict;
ALTER TABLE "ano_letivo_periodo"
  ADD CONSTRAINT "ano_letivo_periodo_instituicao_id_instituicao_id_fk"
  FOREIGN KEY ("instituicao_id") REFERENCES "instituicao"("id") ON DELETE restrict;
ALTER TABLE "ano_letivo_periodo"
  ADD CONSTRAINT "ano_letivo_periodo_professor_dono_id_usuario_id_fk"
  FOREIGN KEY ("professor_dono_id") REFERENCES "usuario"("id") ON DELETE restrict;

CREATE INDEX IF NOT EXISTS "idx_periodo_instituicao" ON "ano_letivo_periodo" ("instituicao_id");
CREATE INDEX IF NOT EXISTS "idx_periodo_professor" ON "ano_letivo_periodo" ("professor_dono_id");

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Turma: ganha ano letivo, dono em duas colunas, código de convite
-- ─────────────────────────────────────────────────────────────────────────────

-- `periodo` é substituído por `ano_letivo_id`.
ALTER TABLE "turma" DROP CONSTRAINT IF EXISTS "uq_turma_instituicao_nome_periodo";

-- Uma turma pode pertencer a um professor independente, sem instituição.
ALTER TABLE "turma" ALTER COLUMN "instituicao_id" DROP NOT NULL;

-- Vários professores por turma: o vínculo sai da turma e vai para professor_turma.
ALTER TABLE "turma" DROP COLUMN IF EXISTS "professor_id";
ALTER TABLE "turma" DROP COLUMN IF EXISTS "periodo";

ALTER TABLE "turma" ADD COLUMN IF NOT EXISTS "professor_dono_id" uuid;
ALTER TABLE "turma" ADD COLUMN IF NOT EXISTS "ano_letivo_id" uuid NOT NULL;
ALTER TABLE "turma" ADD COLUMN IF NOT EXISTS "codigo_convite" text;
ALTER TABLE "turma" ADD COLUMN IF NOT EXISTS "codigo_expira_em" timestamp with time zone;
ALTER TABLE "turma" ADD COLUMN IF NOT EXISTS "arquivada" boolean DEFAULT false NOT NULL;

ALTER TABLE "turma"
  ADD CONSTRAINT "turma_professor_dono_id_usuario_id_fk"
  FOREIGN KEY ("professor_dono_id") REFERENCES "usuario"("id") ON DELETE restrict;
ALTER TABLE "turma"
  ADD CONSTRAINT "turma_ano_letivo_id_ano_letivo_id_fk"
  FOREIGN KEY ("ano_letivo_id") REFERENCES "ano_letivo"("id") ON DELETE restrict;

ALTER TABLE "turma" ADD CONSTRAINT "turma_codigo_convite_unique" UNIQUE ("codigo_convite");
ALTER TABLE "turma" ADD CONSTRAINT "uq_turma_instituicao_ano_nome"
  UNIQUE ("instituicao_id", "ano_letivo_id", "nome");
ALTER TABLE "turma" ADD CONSTRAINT "uq_turma_professor_ano_nome"
  UNIQUE ("professor_dono_id", "ano_letivo_id", "nome");
ALTER TABLE "turma" ADD CONSTRAINT "ck_turma_dono_unico" CHECK (
  ("instituicao_id" IS NOT NULL AND "professor_dono_id" IS NULL)
  OR ("instituicao_id" IS NULL AND "professor_dono_id" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "idx_turma_instituicao" ON "turma" ("instituicao_id");
CREATE INDEX IF NOT EXISTS "idx_turma_professor_dono" ON "turma" ("professor_dono_id");
CREATE INDEX IF NOT EXISTS "idx_turma_ano_letivo" ON "turma" ("ano_letivo_id");

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Quem leciona em cada turma
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "professor_turma" (
  "turma_id" uuid NOT NULL,
  "professor_id" uuid NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "professor_turma_turma_id_professor_id_pk" PRIMARY KEY ("turma_id", "professor_id")
);

ALTER TABLE "professor_turma"
  ADD CONSTRAINT "professor_turma_turma_id_turma_id_fk"
  FOREIGN KEY ("turma_id") REFERENCES "turma"("id") ON DELETE cascade;
ALTER TABLE "professor_turma"
  ADD CONSTRAINT "professor_turma_professor_id_usuario_id_fk"
  FOREIGN KEY ("professor_id") REFERENCES "usuario"("id") ON DELETE restrict;

CREATE INDEX IF NOT EXISTS "idx_professor_turma_professor" ON "professor_turma" ("professor_id");

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Matrícula: solicitação, aprovação e consentimento
-- ─────────────────────────────────────────────────────────────────────────────
-- `aprovado_em` é o INÍCIO DA JANELA DE DADOS: instituição e professor só podem
-- ver o que o aluno gerou depois dele.
ALTER TABLE "matricula_turma"
  ADD COLUMN IF NOT EXISTS "status" "matricula_status" DEFAULT 'pendente' NOT NULL;
ALTER TABLE "matricula_turma"
  ADD COLUMN IF NOT EXISTS "solicitado_em" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "matricula_turma"
  ADD COLUMN IF NOT EXISTS "consentimento_em" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "matricula_turma"
  ADD COLUMN IF NOT EXISTS "aprovado_em" timestamp with time zone;
ALTER TABLE "matricula_turma"
  ADD COLUMN IF NOT EXISTS "aprovado_por" uuid;

ALTER TABLE "matricula_turma"
  ADD CONSTRAINT "matricula_turma_aprovado_por_usuario_id_fk"
  FOREIGN KEY ("aprovado_por") REFERENCES "usuario"("id") ON DELETE restrict;

-- Rede de segurança: matrícula ativa sem data de aprovação abriria o histórico
-- inteiro do aluno para a turma.
ALTER TABLE "matricula_turma" ADD CONSTRAINT "ck_matricula_ativa_tem_aprovacao"
  CHECK ("status" <> 'ativa' OR "aprovado_em" IS NOT NULL);

CREATE INDEX IF NOT EXISTS "idx_matricula_estudante_status"
  ON "matricula_turma" ("estudante_id", "status");
CREATE INDEX IF NOT EXISTS "idx_matricula_turma_status"
  ON "matricula_turma" ("turma_id", "status");
