CREATE TYPE "public"."dificuldade_tri" AS ENUM('facil', 'media', 'dificil');--> statement-breakpoint
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
CREATE TABLE "trilha_estudo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text NOT NULL,
	"passos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questoes_enem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area" "area_conhecimento" NOT NULL,
	"ano" integer NOT NULL,
	"texto_base" text,
	"enunciado" text NOT NULL,
	"alternativas" jsonb NOT NULL,
	"correta" integer NOT NULL,
	"habilidade_bncc" varchar(255),
	"dificuldade_tri" "dificuldade_tri" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "perfil_onboarding" ADD COLUMN "idade" integer;--> statement-breakpoint
ALTER TABLE "perfil_onboarding" ADD COLUMN "serie" text;--> statement-breakpoint
ALTER TABLE "tentativa_resposta" ADD COLUMN "temas_erro" jsonb;--> statement-breakpoint
ALTER TABLE "batalhas_pvp" ADD CONSTRAINT "batalhas_pvp_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trilha_estudo" ADD CONSTRAINT "trilha_estudo_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_batalha_pvp_area_score" ON "batalhas_pvp" USING btree ("area","score_final");--> statement-breakpoint
CREATE INDEX "idx_batalha_pvp_criado" ON "batalhas_pvp" USING btree ("criado_em");