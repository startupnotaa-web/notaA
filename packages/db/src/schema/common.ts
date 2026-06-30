import { customType } from 'drizzle-orm/pg-core';

// citext (case-insensitive text) — usado em usuario.email (doc 04 §2).
// Requer `CREATE EXTENSION IF NOT EXISTS citext;` na migration (ver drizzle.config.ts).
export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

// TODO (doc 04 §0): a convenção pede PK uuid v7 (ordenável por tempo). Postgres não
// tem gen_random_uuid() v7 nativo; usamos defaultRandom() (v4) por ora. Revisitar
// com a extensão pg_uuidv7 (ou geração na aplicação) antes de produção em escala.
