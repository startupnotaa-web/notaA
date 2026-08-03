-- Simulado multi-área (doc 08 E6) — bloco fechado de questões, sem feedback por
-- questão: acerto/erro só saem no relatório final.
--
-- Reusa `sessao_avaliativa` (tipo='simulado', area_conhecimento NULL) e
-- `tentativa_resposta` em vez de duplicar o conceito de sessão/resposta.

CREATE TYPE "simulado_modo" AS ENUM('cronometrado', 'livre');--> statement-breakpoint
CREATE TYPE "simulado_origem" AS ENUM('enem', 'ia');--> statement-breakpoint

-- Lançamento de XP do simulado: sem isto, grantXp falha por violação do enum.
ALTER TYPE "xp_origem" ADD VALUE IF NOT EXISTS 'simulado';--> statement-breakpoint

CREATE TABLE "simulado_sessao" (
	"sessao_id" uuid PRIMARY KEY NOT NULL,
	"modo" "simulado_modo" NOT NULL,
	"limite_minutos" integer,
	"expira_em" timestamp with time zone,
	"total_questoes" integer NOT NULL,
	"acertos" integer,
	"xp_concedido" integer,
	"expirado" boolean DEFAULT false NOT NULL,
	"finalizado_em" timestamp with time zone
);--> statement-breakpoint

CREATE TABLE "simulado_questao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessao_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"area" "area_conhecimento" NOT NULL,
	"dificuldade" "dificuldade_tri" NOT NULL,
	"origem" "simulado_origem" NOT NULL
);--> statement-breakpoint

ALTER TABLE "simulado_sessao" ADD CONSTRAINT "simulado_sessao_sessao_id_sessao_avaliativa_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessao_avaliativa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulado_questao" ADD CONSTRAINT "simulado_questao_sessao_id_simulado_sessao_sessao_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."simulado_sessao"("sessao_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulado_questao" ADD CONSTRAINT "simulado_questao_item_id_banco_de_itens_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."banco_de_itens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "idx_simulado_sessao_expira" ON "simulado_sessao" USING btree ("expira_em");--> statement-breakpoint
CREATE INDEX "idx_simulado_questao_sessao_ordem" ON "simulado_questao" USING btree ("sessao_id","ordem");--> statement-breakpoint
CREATE INDEX "idx_simulado_questao_item" ON "simulado_questao" USING btree ("item_id");
