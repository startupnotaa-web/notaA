CREATE TABLE "notificacao_cuidado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ocorrencia_id" uuid NOT NULL,
	"destinatario_id" uuid NOT NULL,
	"papel_destinatario" text NOT NULL,
	"canal" text DEFAULT 'in_app' NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"enviado_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notificacao_cuidado" ADD CONSTRAINT "notificacao_cuidado_ocorrencia_id_ocorrencia_risco_id_fk" FOREIGN KEY ("ocorrencia_id") REFERENCES "public"."ocorrencia_risco"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacao_cuidado" ADD CONSTRAINT "notificacao_cuidado_destinatario_id_usuario_id_fk" FOREIGN KEY ("destinatario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notificacao_cuidado_destinatario_criado" ON "notificacao_cuidado" USING btree ("destinatario_id","criado_em");--> statement-breakpoint
CREATE INDEX "idx_notificacao_cuidado_ocorrencia" ON "notificacao_cuidado" USING btree ("ocorrencia_id");