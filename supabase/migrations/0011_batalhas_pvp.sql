-- Recorte da 0003_confused_jack_flag: apenas o bloco `batalhas_pvp`, que era a
-- única parte daquela migração ausente no schema real (o resto — enum
-- `dificuldade_tri`, `trilha_estudo`, `questoes_enem`, colunas de
-- `perfil_onboarding`/`tentativa_resposta` — já estava aplicado).
--
-- Criada em vez de reexecutar a 0003 original, que falharia no
-- `CREATE TYPE "dificuldade_tri"` (já existente, sem IF NOT EXISTS).

CREATE TABLE "batalhas_pvp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"area" "area_conhecimento" NOT NULL,
	"questoes" jsonb NOT NULL,
	"tempo_respostas" jsonb NOT NULL,
	"score_final" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "batalhas_pvp" ADD CONSTRAINT "batalhas_pvp_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_batalha_pvp_area_score" ON "batalhas_pvp" USING btree ("area","score_final");--> statement-breakpoint
CREATE INDEX "idx_batalha_pvp_criado" ON "batalhas_pvp" USING btree ("criado_em");
