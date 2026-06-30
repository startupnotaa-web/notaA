// Token de DI para o cliente Drizzle (@notaa/db) — único ponto que conhece a
// string de conexão; demais módulos só dependem do tipo `Database`.
export const DB_CLIENT = Symbol('DB_CLIENT');
