import type { Config } from 'drizzle-kit';

// Migrations geradas aqui são copiadas/aplicadas via supabase/migrations (doc 09 §1).
// Requer `CREATE EXTENSION IF NOT EXISTS citext;` antes da 1ª migration (doc 04 §2, coluna usuario.email).
export default {
  schema: './src/schema/index.ts',
  out: '../../supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
} satisfies Config;
