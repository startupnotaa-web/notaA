import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Esta factory é usada SÓ por apps/api e apps/worker (service role — doc 03 §3).
// O cliente PWA (apps/web) nunca importa este módulo (regra de fronteira, doc 09 §2).
export function createDbClient(databaseUrl: string | undefined) {
  // Configuração otimizada para Serverless (Vercel):
  // connect_timeout: falha rápido (5s) em vez de pendurar a lambda até o limite de 10s da Vercel.
  // max: limita conexões concorrentes da mesma lambda.
  const queryClient = postgres(databaseUrl || 'postgresql://fake:fake@fake/fake', {
    max: 1,
    connect_timeout: 5,
    idle_timeout: 10,
  });
  return drizzle(queryClient, { schema });
}

export type Database = ReturnType<typeof createDbClient>;

/**
 * O que os repositórios de fato precisam: um executor de queries — o client
 * completo OU o handle de uma transação aberta (`db.transaction((tx) => ...)`).
 * Permite reusar o MESMO repositório dentro de uma unidade de trabalho
 * transacional (ex.: responder questão = tentativa + theta + XP + streak
 * atômicos, doc 04 §4 / auditoria E7).
 */
export type DbExecutor = Database | Parameters<Parameters<Database['transaction']>[0]>[0];
