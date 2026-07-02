import { createDbClient, conquista } from '@notaa/db';
const db = createDbClient(process.env.DATABASE_URL);

async function main() {
  const marcos = [
    { codigo: 'streak_3_dias', criterio: { tipo: 'streak', dias: 3 }, xpAssociado: 50 },
    { codigo: 'streak_7_dias', criterio: { tipo: 'streak', dias: 7 }, xpAssociado: 100 },
    { codigo: 'streak_15_dias', criterio: { tipo: 'streak', dias: 15 }, xpAssociado: 200 },
    { codigo: 'streak_30_dias', criterio: { tipo: 'streak', dias: 30 }, xpAssociado: 500 },
    { codigo: 'streak_60_dias', criterio: { tipo: 'streak', dias: 60 }, xpAssociado: 1000 },
    { codigo: 'streak_120_dias', criterio: { tipo: 'streak', dias: 120 }, xpAssociado: 2500 },
    { codigo: 'streak_240_dias', criterio: { tipo: 'streak', dias: 240 }, xpAssociado: 5000 },
  ];

  console.log('Semeando conquistas de streak...');
  for (const marco of marcos) {
    try {
      await db.insert(conquista).values({
        codigo: marco.codigo,
        criterio: marco.criterio,
        xpAssociado: marco.xpAssociado,
      }).onConflictDoNothing({ target: conquista.codigo });
      console.log(`Conquista ${marco.codigo} garantida no DB.`);
    } catch (e: any) {
      console.log(`Falha em ${marco.codigo}:`, e.message);
    }
  }
  
  console.log('Seed de conquistas finalizado!');
  process.exit(0);
}

main().catch(console.error);
