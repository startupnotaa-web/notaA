import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Esta factory é usada SÓ por apps/api e apps/worker (service role — doc 03 §3).
// O cliente PWA (apps/web) nunca importa este módulo (regra de fronteira, doc 09 §2).
export function createDbClient(databaseUrl: string) {
  const queryClient = postgres(databaseUrl);
  return drizzle(queryClient, { schema });
}

export type Database = ReturnType<typeof createDbClient>;
