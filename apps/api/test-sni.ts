import postgres from 'postgres';
const sql = postgres('postgresql://postgres.rvxkpafwowzfvczpzgji:l17b1i5O4LZf5w1Y@aws-0-sa-east-1.pooler.supabase.com:6543/postgres');
sql`SELECT 1`.then(() => console.log('Connected Transaction Pooler!')).catch(console.error).finally(() => sql.end());
