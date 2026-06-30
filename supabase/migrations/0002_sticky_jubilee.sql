ALTER TABLE "perfil_cognitivo_4d" ADD COLUMN "xp_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "perfil_cognitivo_4d" ADD COLUMN "nivel_atual" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "perfil_cognitivo_4d" ADD COLUMN "ofensiva_dias" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "perfil_cognitivo_4d" ADD CONSTRAINT "ck_perfil4d_xp_total" CHECK ("perfil_cognitivo_4d"."xp_total" >= 0);--> statement-breakpoint
ALTER TABLE "perfil_cognitivo_4d" ADD CONSTRAINT "ck_perfil4d_nivel_atual" CHECK ("perfil_cognitivo_4d"."nivel_atual" >= 1);--> statement-breakpoint
ALTER TABLE "perfil_cognitivo_4d" ADD CONSTRAINT "ck_perfil4d_ofensiva_dias" CHECK ("perfil_cognitivo_4d"."ofensiva_dias" >= 0);