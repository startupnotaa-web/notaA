import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { drizzle } from 'drizzle-orm/pglite';
import type { Database } from '../client';
import * as schema from '../schema';

// Postgres descartável, em memória (PGlite = Postgres compilado para WASM).
// Existe porque a suíte e2e da API já chegou a ler o banco de PRODUÇÃO pelo
// DATABASE_URL do .env (perfis-decisoes.md, 2026-10-02). Teste que precisa de
// banco usa ISTO: sem rede, sem Docker, sem variável de ambiente.
//
// Sobe as migrações reais de supabase/migrations, na ordem, mais o mínimo que o
// Supabase fornece e as migrações assumem: os papéis `anon`/`authenticated`,
// os privilégios padrão que o Supabase dá a eles e `auth.uid()`, que aqui lê o
// `sub` de `request.jwt.claim.sub` (setado por `comoUsuario`).

const MIGRACOES = join(__dirname, '../../../../supabase/migrations');

// Migrações de REPARO de produção que repetem o que outra já faz num banco
// limpo. Rodá-las aqui falharia por objeto duplicado.
const MIGRACOES_DE_REPARO: Record<string, string> = {
  '0011_batalhas_pvp.sql': 'recorte da 0003, que num banco limpo já criou batalhas_pvp',
};

const PRELUDIO_SUPABASE = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;
  CREATE SCHEMA auth;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
`;

export interface BancoDeTeste {
  pg: PGlite;
  /** Drizzle sobre o PGlite. Mesmo construtor de queries do cliente de produção. */
  db: Database;
  /**
   * Roda `fn` numa transação como o usuário de `authUid`, com o papel
   * `authenticated` (RLS valendo). `authUid` nulo simula o papel `anon`.
   */
  comoUsuario<T>(authUid: string | null, fn: (pg: PGlite['query']) => Promise<T>): Promise<T>;
}

export async function criarBancoDeTeste(): Promise<BancoDeTeste> {
  const pg = new PGlite({ extensions: { citext } });
  await pg.exec(PRELUDIO_SUPABASE);
  const arquivos = readdirSync(MIGRACOES)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f) && !(f in MIGRACOES_DE_REPARO))
    .sort();
  for (const arquivo of arquivos) {
    try {
      await pg.exec(readFileSync(join(MIGRACOES, arquivo), 'utf8'));
    } catch (e) {
      throw new Error(`Migração ${arquivo} falhou no banco de teste: ${(e as Error).message}`);
    }
  }
  const db = drizzle(pg, { schema }) as unknown as Database;

  async function comoUsuario<T>(
    authUid: string | null,
    fn: (query: PGlite['query']) => Promise<T>,
  ): Promise<T> {
    return pg.transaction(async (tx) => {
      await tx.query(`SET LOCAL ROLE ${authUid ? 'authenticated' : 'anon'}`);
      await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [authUid ?? '']);
      return fn(tx.query.bind(tx) as PGlite['query']);
    });
  }

  return { pg, db, comoUsuario };
}
