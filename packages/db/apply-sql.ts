import { createClient } from '@supabase/supabase-js';

import postgres from 'postgres';

async function main() {
  console.log('Connecting to', process.env.DATABASE_URL);
  const sql = postgres(process.env.DATABASE_URL!);

  try {
    // 0003
    await sql.unsafe(`
      CREATE TYPE "public"."dificuldade_tri" AS ENUM('facil', 'media', 'dificil');
    `).catch(() => console.log('Enum dificuldade_tri already exists'));
    
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "questoes_enem" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "area" "area_conhecimento" NOT NULL,
        "ano" integer NOT NULL,
        "texto_base" text,
        "enunciado" text NOT NULL,
        "alternativas" jsonb NOT NULL,
        "correta" integer NOT NULL,
        "habilidade_bncc" varchar(255),
        "dificuldade_tri" "dificuldade_tri" NOT NULL,
        "imagem_url" text
      );
    `);
    
    // Certificados_conquista (Gamificacao)
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "certificados_conquista" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "usuario_id" uuid NOT NULL,
        "tipo" text NOT NULL,
        "data_emissao" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);

    // Adicionando foreign key para certificados_conquista
    await sql.unsafe(`
      ALTER TABLE "certificados_conquista" 
      ADD CONSTRAINT "cert_usuario_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
    `).catch(() => console.log('FK already exists or error'));

    // Adicionando os novos campos na tabela usuario se não existirem
    await sql.unsafe(`
      ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "streak_atual" integer DEFAULT 0;
      ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "ultimo_dia_acessado" timestamp with time zone;
      ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "congelamentos_disponiveis" integer DEFAULT 0;
    `);

    console.log('Tabelas criadas com sucesso!');
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await sql.end();
  }
}

main();
