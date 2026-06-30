const postgres = require('postgres');
const sql = postgres('postgresql://postgres.rvxkpafwowzfvczpzgji:l17b1i5O4LZf5w1Y@aws-1-sa-east-1.pooler.supabase.com:6543/postgres');
sql`SELECT 1`.then((res) => console.log('Connected AWS-1!', res)).catch(console.error).finally(() => sql.end());
