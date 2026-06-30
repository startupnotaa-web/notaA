CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE TYPE "public"."adaptacao_origem" AS ENUM('manual', 'inferida');--> statement-breakpoint
CREATE TYPE "public"."area_conhecimento" AS ENUM('linguagens', 'humanas', 'natureza', 'matematica');--> statement-breakpoint
CREATE TYPE "public"."assinatura_status" AS ENUM('ativa', 'inadimplente', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."duelo_status" AS ENUM('aguardando', 'em_andamento', 'encerrado');--> statement-breakpoint
CREATE TYPE "public"."duelo_tipo" AS ENUM('1v1', 'coletiva_turma');--> statement-breakpoint
CREATE TYPE "public"."erro_classificacao" AS ENUM('lacuna_conhecimento', 'deslize_atencao');--> statement-breakpoint
CREATE TYPE "public"."ia_integracao" AS ENUM('socratica', 'redacao');--> statement-breakpoint
CREATE TYPE "public"."mensagem_papel" AS ENUM('estudante', 'tutor', 'sistema');--> statement-breakpoint
CREATE TYPE "public"."plano_tipo" AS ENUM('free', 'plus', 'escola');--> statement-breakpoint
CREATE TYPE "public"."ranking_escopo" AS ENUM('turma', 'escola');--> statement-breakpoint
CREATE TYPE "public"."redacao_status" AS ENUM('em_correcao', 'corrigida', 'falha', 'bloqueada_protocolo');--> statement-breakpoint
CREATE TYPE "public"."risco_origem" AS ENUM('socratica', 'redacao');--> statement-breakpoint
CREATE TYPE "public"."risco_severidade" AS ENUM('baixa', 'media', 'alta');--> statement-breakpoint
CREATE TYPE "public"."risco_status_acompanhamento" AS ENUM('aberto', 'em_acompanhamento', 'encerrado');--> statement-breakpoint
CREATE TYPE "public"."sessao_status" AS ENUM('em_andamento', 'concluida', 'abandonada');--> statement-breakpoint
CREATE TYPE "public"."sessao_tipo" AS ENUM('quiz', 'simulado', 'duelo');--> statement-breakpoint
CREATE TYPE "public"."status_usuario" AS ENUM('ativo', 'suspenso', 'pendente');--> statement-breakpoint
CREATE TYPE "public"."tipo_perfil" AS ENUM('estudante', 'professor', 'gestor', 'responsavel', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vinculo_status" AS ENUM('pendente', 'ativo', 'revogado');--> statement-breakpoint
CREATE TYPE "public"."xp_origem" AS ENUM('quiz', 'redacao', 'streak', 'conquista', 'duelo', 'reflexao_erro');--> statement-breakpoint
CREATE TABLE "escola" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"rede" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matricula_turma" (
	"turma_id" uuid NOT NULL,
	"estudante_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matricula_turma_turma_id_estudante_id_pk" PRIMARY KEY("turma_id","estudante_id")
);
--> statement-breakpoint
CREATE TABLE "turma" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escola_id" uuid NOT NULL,
	"professor_id" uuid,
	"nome" text NOT NULL,
	"periodo" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_turma_escola_nome_periodo" UNIQUE("escola_id","nome","periodo")
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo_perfil" "tipo_perfil" NOT NULL,
	"nome" text,
	"email" "citext" NOT NULL,
	"auth_uid" uuid,
	"status" "status_usuario" DEFAULT 'pendente' NOT NULL,
	"escola_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_auth_uid_unique" UNIQUE("auth_uid"),
	CONSTRAINT "uq_usuario_email" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vinculo_responsavel" (
	"responsavel_id" uuid NOT NULL,
	"estudante_id" uuid NOT NULL,
	"permissoes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "vinculo_status" DEFAULT 'pendente' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vinculo_responsavel_responsavel_id_estudante_id_pk" PRIMARY KEY("responsavel_id","estudante_id")
);
--> statement-breakpoint
CREATE TABLE "adaptacao_ativa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"parametros" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" "adaptacao_origem" NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dado_sensivel_estudante" (
	"estudante_id" uuid PRIMARY KEY NOT NULL,
	"neurodivergencia" jsonb,
	"consentimento_base_legal" text,
	"consentido_por" uuid,
	"consentido_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perfil_cognitivo_4d" (
	"estudante_id" uuid PRIMARY KEY NOT NULL,
	"eixo_visual_verbal" numeric(4, 3) DEFAULT '0' NOT NULL,
	"eixo_analitico_holistico" numeric(4, 3) DEFAULT '0' NOT NULL,
	"eixo_sequencial_aleatorio" numeric(4, 3) DEFAULT '0' NOT NULL,
	"eixo_reflexivo_impulsivo" numeric(4, 3) DEFAULT '0' NOT NULL,
	"confianca" numeric(4, 3) DEFAULT '0' NOT NULL,
	"recomendacoes_ativas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_perfil4d_visual_verbal" CHECK ("perfil_cognitivo_4d"."eixo_visual_verbal" between -1 and 1),
	CONSTRAINT "ck_perfil4d_analitico_holistico" CHECK ("perfil_cognitivo_4d"."eixo_analitico_holistico" between -1 and 1),
	CONSTRAINT "ck_perfil4d_sequencial_aleatorio" CHECK ("perfil_cognitivo_4d"."eixo_sequencial_aleatorio" between -1 and 1),
	CONSTRAINT "ck_perfil4d_reflexivo_impulsivo" CHECK ("perfil_cognitivo_4d"."eixo_reflexivo_impulsivo" between -1 and 1),
	CONSTRAINT "ck_perfil4d_confianca" CHECK ("perfil_cognitivo_4d"."confianca" between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE "perfil_cognitivo_evento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"motivo" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perfil_onboarding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"objetivo_enem" text,
	"estilo_aprendizagem_autodeclarado" jsonb,
	"dificuldades" jsonb,
	"rotina_estudo" jsonb,
	"autopercepcao" jsonb,
	"passo_atual" integer DEFAULT 1 NOT NULL,
	"concluido_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "perfil_onboarding_estudante_id_unique" UNIQUE("estudante_id")
);
--> statement-breakpoint
CREATE TABLE "banco_de_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area_conhecimento" "area_conhecimento" NOT NULL,
	"competencia" text NOT NULL,
	"param_a" numeric NOT NULL,
	"param_b" numeric NOT NULL,
	"param_c" numeric NOT NULL,
	"enunciado" text NOT NULL,
	"alternativas" jsonb NOT NULL,
	"gabarito" text NOT NULL,
	"metadados_uso" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"nao_calibrado" boolean DEFAULT true NOT NULL,
	"versao_calibracao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_banco_itens_param_c" CHECK ("banco_de_itens"."param_c" between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE "habilidade_estudante" (
	"estudante_id" uuid NOT NULL,
	"area_conhecimento" "area_conhecimento" NOT NULL,
	"theta" numeric DEFAULT '0' NOT NULL,
	"erro_padrao" numeric DEFAULT '1' NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habilidade_estudante_estudante_id_area_conhecimento_pk" PRIMARY KEY("estudante_id","area_conhecimento")
);
--> statement-breakpoint
CREATE TABLE "sessao_avaliativa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"tipo" "sessao_tipo" NOT NULL,
	"iniciado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"finalizado_em" timestamp with time zone,
	"status" "sessao_status" DEFAULT 'em_andamento' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tentativa_resposta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"sessao_id" uuid NOT NULL,
	"resposta" text NOT NULL,
	"acerto" boolean NOT NULL,
	"tempo_resposta_ms" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tentativa_idempotency_key" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "theta_evento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"area_conhecimento" "area_conhecimento" NOT NULL,
	"theta" numeric NOT NULL,
	"erro_padrao" numeric NOT NULL,
	"tentativa_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ocorrencia_erro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"item_id" uuid,
	"competencia" text,
	"classificacao" "erro_classificacao" NOT NULL,
	"evidencias" jsonb NOT NULL,
	"confianca" numeric NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avaliacao_competencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"avaliacao_id" uuid NOT NULL,
	"competencia" integer NOT NULL,
	"nota" integer NOT NULL,
	"justificativa" text NOT NULL,
	"citacoes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "uq_avaliacao_competencia" UNIQUE("avaliacao_id","competencia"),
	CONSTRAINT "ck_avaliacao_competencia_numero" CHECK ("avaliacao_competencia"."competencia" between 1 and 5),
	CONSTRAINT "ck_avaliacao_competencia_nota" CHECK ("avaliacao_competencia"."nota" between 0 and 200)
);
--> statement-breakpoint
CREATE TABLE "avaliacao_redacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"redacao_id" uuid NOT NULL,
	"nota_total" integer NOT NULL,
	"feedback_geral" jsonb NOT NULL,
	"rubrica_id" uuid NOT NULL,
	"motor_versao" text NOT NULL,
	"modelo_versao" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avaliacao_redacao_redacao_id_unique" UNIQUE("redacao_id"),
	CONSTRAINT "ck_avaliacao_redacao_nota_total" CHECK ("avaliacao_redacao"."nota_total" between 0 and 1000)
);
--> statement-breakpoint
CREATE TABLE "conversa_socratica" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"sessao_id" uuid,
	"tema_ativo" text,
	"resumo_contexto" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensagem_socratica" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversa_id" uuid NOT NULL,
	"papel" "mensagem_papel" NOT NULL,
	"conteudo" text NOT NULL,
	"estado_maquina" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ocorrencia_risco" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"origem" "risco_origem" NOT NULL,
	"referencia_id" uuid NOT NULL,
	"sinal" text NOT NULL,
	"severidade" "risco_severidade" NOT NULL,
	"acao_tomada" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status_acompanhamento" "risco_status_acompanhamento" DEFAULT 'aberto' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"tema_id" uuid,
	"tema_livre" text,
	"texto" text NOT NULL,
	"status" "redacao_status" DEFAULT 'em_correcao' NOT NULL,
	"enviado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubrica_redacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"versao" text NOT NULL,
	"definicao" jsonb NOT NULL,
	"nao_calibrado" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_rubrica_redacao_versao" UNIQUE("versao")
);
--> statement-breakpoint
CREATE TABLE "tema_redacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"texto_motivador" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conquista" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"criterio" jsonb NOT NULL,
	"xp_associado" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_conquista_codigo" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "conquista_concedida" (
	"estudante_id" uuid NOT NULL,
	"conquista_id" uuid NOT NULL,
	"concedido_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conquista_concedida_estudante_id_conquista_id_pk" PRIMARY KEY("estudante_id","conquista_id")
);
--> statement-breakpoint
CREATE TABLE "duelo_participante" (
	"duelo_id" uuid NOT NULL,
	"participante_id" uuid NOT NULL,
	"pontos" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "duelo_participante_duelo_id_participante_id_pk" PRIMARY KEY("duelo_id","participante_id")
);
--> statement-breakpoint
CREATE TABLE "duelo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "duelo_tipo" NOT NULL,
	"status" "duelo_status" DEFAULT 'aguardando' NOT NULL,
	"placar" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranking_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escopo" "ranking_escopo" NOT NULL,
	"escopo_id" uuid NOT NULL,
	"periodo" text NOT NULL,
	"posicoes" jsonb NOT NULL,
	"gerado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streak" (
	"estudante_id" uuid PRIMARY KEY NOT NULL,
	"dias_consecutivos" integer DEFAULT 0 NOT NULL,
	"ultima_atividade_valida" date,
	"freezes_disponiveis" integer DEFAULT 0 NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"origem" "xp_origem" NOT NULL,
	"referencia_id" uuid,
	"valor" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_xp_ledger_valor_nao_zero" CHECK ("xp_ledger"."valor" <> 0)
);
--> statement-breakpoint
CREATE TABLE "assinatura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"escola_id" uuid,
	"plano_id" uuid NOT NULL,
	"status" "assinatura_status" DEFAULT 'ativa' NOT NULL,
	"vigencia_inicio" timestamp with time zone DEFAULT now() NOT NULL,
	"vigencia_fim" timestamp with time zone,
	CONSTRAINT "ck_assinatura_titular_unico" CHECK (("assinatura"."usuario_id" is not null and "assinatura"."escola_id" is null) or ("assinatura"."usuario_id" is null and "assinatura"."escola_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "contador_rate_limit" (
	"usuario_id" uuid NOT NULL,
	"integracao" "ia_integracao" NOT NULL,
	"janela_inicio" timestamp with time zone NOT NULL,
	"contagem" integer DEFAULT 0 NOT NULL,
	"limite" integer NOT NULL,
	CONSTRAINT "contador_rate_limit_usuario_id_integracao_janela_inicio_pk" PRIMARY KEY("usuario_id","integracao","janela_inicio")
);
--> statement-breakpoint
CREATE TABLE "log_auditoria_admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"acao" text NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" uuid,
	"diff" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_uso_ia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"integracao" "ia_integracao" NOT NULL,
	"prompt_versao_id" uuid,
	"tokens_in" integer,
	"tokens_out" integer,
	"custo_estimado" numeric,
	"sucesso" boolean NOT NULL,
	"latencia_ms" integer,
	"correlation_id" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plano" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "plano_tipo" NOT NULL,
	"limites_ia" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recursos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_plano_tipo" UNIQUE("tipo")
);
--> statement-breakpoint
CREATE TABLE "prompt_versionado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integracao" "ia_integracao" NOT NULL,
	"versao" text NOT NULL,
	"conteudo" text NOT NULL,
	"ativo" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_prompt_versionado_integracao_versao" UNIQUE("integracao","versao")
);
--> statement-breakpoint
ALTER TABLE "matricula_turma" ADD CONSTRAINT "matricula_turma_turma_id_turma_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turma"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matricula_turma" ADD CONSTRAINT "matricula_turma_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turma" ADD CONSTRAINT "turma_escola_id_escola_id_fk" FOREIGN KEY ("escola_id") REFERENCES "public"."escola"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turma" ADD CONSTRAINT "turma_professor_id_usuario_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_escola_id_escola_id_fk" FOREIGN KEY ("escola_id") REFERENCES "public"."escola"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculo_responsavel" ADD CONSTRAINT "vinculo_responsavel_responsavel_id_usuario_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculo_responsavel" ADD CONSTRAINT "vinculo_responsavel_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adaptacao_ativa" ADD CONSTRAINT "adaptacao_ativa_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dado_sensivel_estudante" ADD CONSTRAINT "dado_sensivel_estudante_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfil_cognitivo_4d" ADD CONSTRAINT "perfil_cognitivo_4d_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfil_cognitivo_evento" ADD CONSTRAINT "perfil_cognitivo_evento_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfil_onboarding" ADD CONSTRAINT "perfil_onboarding_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habilidade_estudante" ADD CONSTRAINT "habilidade_estudante_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessao_avaliativa" ADD CONSTRAINT "sessao_avaliativa_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tentativa_resposta" ADD CONSTRAINT "tentativa_resposta_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tentativa_resposta" ADD CONSTRAINT "tentativa_resposta_item_id_banco_de_itens_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."banco_de_itens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tentativa_resposta" ADD CONSTRAINT "tentativa_resposta_sessao_id_sessao_avaliativa_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessao_avaliativa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theta_evento" ADD CONSTRAINT "theta_evento_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theta_evento" ADD CONSTRAINT "theta_evento_tentativa_id_tentativa_resposta_id_fk" FOREIGN KEY ("tentativa_id") REFERENCES "public"."tentativa_resposta"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocorrencia_erro" ADD CONSTRAINT "ocorrencia_erro_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocorrencia_erro" ADD CONSTRAINT "ocorrencia_erro_item_id_banco_de_itens_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."banco_de_itens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacao_competencia" ADD CONSTRAINT "avaliacao_competencia_avaliacao_id_avaliacao_redacao_id_fk" FOREIGN KEY ("avaliacao_id") REFERENCES "public"."avaliacao_redacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacao_redacao" ADD CONSTRAINT "avaliacao_redacao_redacao_id_redacao_id_fk" FOREIGN KEY ("redacao_id") REFERENCES "public"."redacao"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacao_redacao" ADD CONSTRAINT "avaliacao_redacao_rubrica_id_rubrica_redacao_id_fk" FOREIGN KEY ("rubrica_id") REFERENCES "public"."rubrica_redacao"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversa_socratica" ADD CONSTRAINT "conversa_socratica_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversa_socratica" ADD CONSTRAINT "conversa_socratica_sessao_id_sessao_avaliativa_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessao_avaliativa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagem_socratica" ADD CONSTRAINT "mensagem_socratica_conversa_id_conversa_socratica_id_fk" FOREIGN KEY ("conversa_id") REFERENCES "public"."conversa_socratica"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocorrencia_risco" ADD CONSTRAINT "ocorrencia_risco_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redacao" ADD CONSTRAINT "redacao_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redacao" ADD CONSTRAINT "redacao_tema_id_tema_redacao_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."tema_redacao"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conquista_concedida" ADD CONSTRAINT "conquista_concedida_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conquista_concedida" ADD CONSTRAINT "conquista_concedida_conquista_id_conquista_id_fk" FOREIGN KEY ("conquista_id") REFERENCES "public"."conquista"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duelo_participante" ADD CONSTRAINT "duelo_participante_duelo_id_duelo_id_fk" FOREIGN KEY ("duelo_id") REFERENCES "public"."duelo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streak" ADD CONSTRAINT "streak_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_estudante_id_usuario_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinatura" ADD CONSTRAINT "assinatura_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinatura" ADD CONSTRAINT "assinatura_escola_id_escola_id_fk" FOREIGN KEY ("escola_id") REFERENCES "public"."escola"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinatura" ADD CONSTRAINT "assinatura_plano_id_plano_id_fk" FOREIGN KEY ("plano_id") REFERENCES "public"."plano"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contador_rate_limit" ADD CONSTRAINT "contador_rate_limit_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_auditoria_admin" ADD CONSTRAINT "log_auditoria_admin_admin_id_usuario_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_uso_ia" ADD CONSTRAINT "log_uso_ia_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_uso_ia" ADD CONSTRAINT "log_uso_ia_prompt_versao_id_prompt_versionado_id_fk" FOREIGN KEY ("prompt_versao_id") REFERENCES "public"."prompt_versionado"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_usuario_escola" ON "usuario" USING btree ("escola_id");--> statement-breakpoint
CREATE INDEX "idx_usuario_tipo_perfil" ON "usuario" USING btree ("tipo_perfil");--> statement-breakpoint
CREATE INDEX "idx_adaptacao_ativa_estudante_ativa" ON "adaptacao_ativa" USING btree ("estudante_id","ativa");--> statement-breakpoint
CREATE INDEX "idx_perfil_cognitivo_evento_estudante_criado" ON "perfil_cognitivo_evento" USING btree ("estudante_id","criado_em");--> statement-breakpoint
CREATE INDEX "idx_banco_itens_area_competencia" ON "banco_de_itens" USING btree ("area_conhecimento","competencia");--> statement-breakpoint
CREATE INDEX "idx_banco_itens_ativo" ON "banco_de_itens" USING btree ("ativo") WHERE "banco_de_itens"."ativo" = true;--> statement-breakpoint
CREATE INDEX "idx_sessao_avaliativa_estudante_iniciado" ON "sessao_avaliativa" USING btree ("estudante_id","iniciado_em");--> statement-breakpoint
CREATE INDEX "idx_tentativa_estudante_criado" ON "tentativa_resposta" USING btree ("estudante_id","criado_em");--> statement-breakpoint
CREATE INDEX "idx_tentativa_sessao" ON "tentativa_resposta" USING btree ("sessao_id");--> statement-breakpoint
CREATE INDEX "idx_tentativa_item" ON "tentativa_resposta" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_theta_evento_estudante_area_criado" ON "theta_evento" USING btree ("estudante_id","area_conhecimento","criado_em");--> statement-breakpoint
CREATE INDEX "idx_ocorrencia_erro_estudante_criado" ON "ocorrencia_erro" USING btree ("estudante_id","criado_em");--> statement-breakpoint
CREATE INDEX "idx_conversa_socratica_estudante" ON "conversa_socratica" USING btree ("estudante_id");--> statement-breakpoint
CREATE INDEX "idx_mensagem_socratica_conversa_criado" ON "mensagem_socratica" USING btree ("conversa_id","criado_em");--> statement-breakpoint
CREATE INDEX "idx_ocorrencia_risco_status_criado" ON "ocorrencia_risco" USING btree ("status_acompanhamento","criado_em");--> statement-breakpoint
CREATE INDEX "idx_redacao_estudante_enviado" ON "redacao" USING btree ("estudante_id","enviado_em");--> statement-breakpoint
CREATE INDEX "idx_ranking_snapshot_escopo_periodo" ON "ranking_snapshot" USING btree ("escopo","escopo_id","periodo");--> statement-breakpoint
CREATE INDEX "idx_xp_ledger_estudante_criado" ON "xp_ledger" USING btree ("estudante_id","criado_em");--> statement-breakpoint
CREATE INDEX "idx_assinatura_usuario" ON "assinatura" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "idx_assinatura_escola" ON "assinatura" USING btree ("escola_id");--> statement-breakpoint
CREATE INDEX "idx_log_auditoria_admin_criado" ON "log_auditoria_admin" USING btree ("admin_id","criado_em");--> statement-breakpoint
CREATE INDEX "idx_log_auditoria_entidade" ON "log_auditoria_admin" USING btree ("entidade","entidade_id");--> statement-breakpoint
CREATE INDEX "idx_log_uso_ia_usuario_criado" ON "log_uso_ia" USING btree ("usuario_id","criado_em");--> statement-breakpoint
CREATE INDEX "idx_log_uso_ia_integracao_criado" ON "log_uso_ia" USING btree ("integracao","criado_em");