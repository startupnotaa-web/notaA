CREATE TABLE "quiz_ia_gerado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"area_conhecimento" "area_conhecimento" NOT NULL,
	"tema" text NOT NULL,
	"enunciado" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_ia_gerado" ADD CONSTRAINT "quiz_ia_gerado_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_quiz_ia_gerado_estudante_area_criado" ON "quiz_ia_gerado" USING btree ("estudante_id","area_conhecimento","criado_em");