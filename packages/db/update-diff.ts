import { createDbClient, questoesEnem } from './src'; // use relative path!
import { eq } from 'drizzle-orm';

const db = createDbClient(process.env.DATABASE_URL!);

async function run() {
  const q = await db.select().from(questoesEnem);
  let f = 0, m = 0, d = 0;
  for (let i = 0; i < q.length; i++) {
    const rand = Math.random();
    const diff = rand < 0.33 ? 'facil' : rand < 0.66 ? 'media' : 'dificil';
    await db.update(questoesEnem).set({ dificuldadeTri: diff }).where(eq(questoesEnem.id, q[i].id));
    if (diff === 'facil') f++;
    else if (diff === 'media') m++;
    else d++;
  }
  console.log('Facil:', f, 'Media:', m, 'Dificil:', d);
  process.exit(0);
}

run().catch(console.error);
