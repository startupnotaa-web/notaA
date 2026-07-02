import { createDbClient } from './src';
import { sql } from 'drizzle-orm';

const db = createDbClient(process.env.DATABASE_URL!);

async function run() {
  const statements = [
    `ALTER TYPE "public"."area_conhecimento" ADD VALUE IF NOT EXISTS 'redacao';`,
    `ALTER TYPE "public"."area_conhecimento" ADD VALUE IF NOT EXISTS 'fin';`,
    `ALTER TYPE "public"."area_conhecimento" ADD VALUE IF NOT EXISTS 'soc';`,
    `ALTER TYPE "public"."area_conhecimento" ADD VALUE IF NOT EXISTS 'art';`
  ];

  for (const s of statements) {
    try {
      await db.execute(sql.raw(s));
      console.log('Executed:', s);
    } catch (e) {
      console.error('Error on', s, e);
    }
  }

  process.exit(0);
}

run().catch(console.error);
