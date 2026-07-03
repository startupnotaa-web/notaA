export * from './schema';
export * from './client';
export * from './repositories';

// Operadores do drizzle-orm re-exportados para consumidores externos (apps/api).
// NUNCA declare `drizzle-orm` como dependência direta de outro pacote do
// workspace: isso cria um contexto de peer-dependency distinto do de @notaa/db
// e o pnpm resolve duas instâncias físicas da "mesma" versão — TypeScript trata
// os tipos (SQL<unknown>, Column, etc.) como incompatíveis entre elas. Importe
// os operadores daqui para garantir a MESMA instância usada pelo schema/client.
export { eq, ne, asc, desc, and, inArray, notInArray, count, sql, sum, avg } from 'drizzle-orm';
