import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { questaoServivel } from '../filtros/questoes-servidas';
import { questaoSuspensa, questoesEnem } from '../schema';
import { criarBancoDeTeste, type BancoDeTeste } from '../testing/banco-de-teste';

// O que o aluno pode receber de `questoes_enem`, contra Postgres de verdade
// (PGlite em memória, com as migrações reais, inclusive a 0019).

const CORRECOES = join(__dirname, '../../../../supabase/correcoes');
const ALTERNATIVAS = ['Alternativa um', 'Alternativa dois', 'Alternativa três', 'Alternativa quatro', 'Alternativa cinco'];

let banco: BancoDeTeste;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

beforeEach(async () => {
  await banco.pg.exec('DELETE FROM banco_de_itens; DELETE FROM questoes_enem;');
});

async function questao(
  enunciado: string,
  extra: Partial<typeof questoesEnem.$inferInsert> = {},
): Promise<string> {
  const [row] = await banco.db
    .insert(questoesEnem)
    .values({
      area: 'linguagens',
      ano: 2024,
      enunciado,
      alternativas: ALTERNATIVAS,
      correta: 0,
      dificuldadeTri: 'media',
      ...extra,
    })
    .returning({ id: questoesEnem.id });
  return row!.id;
}

async function servidas(idioma?: 'ingles' | 'espanhol'): Promise<string[]> {
  const rows = await banco.db
    .select({ id: questoesEnem.id })
    .from(questoesEnem)
    .where(questaoServivel(idioma));
  return rows.map((r) => r.id).sort();
}

describe('questaoServivel', () => {
  it('serve questão comum e legível', async () => {
    const a = await questao('Enunciado simples.');
    expect(await servidas()).toEqual([a]);
  });

  it.each(['suspensa', 'anulada', 'arquivada'] as const)(
    'não serve questão %s, qualquer que seja o motivo',
    async (situacao) => {
      const ok = await questao('Enunciado que fica.');
      const fora = await questao('Enunciado que sai.');
      await banco.db
        .insert(questaoSuspensa)
        .values({ questaoId: fora, situacao, motivos: ['teste'] });
      expect(await servidas()).toEqual([ok]);
    },
  );

  it('volta a servir quando a linha de exceção é removida', async () => {
    const q = await questao('Enunciado.');
    await banco.db.insert(questaoSuspensa).values({ questaoId: q, motivos: ['teste'] });
    expect(await servidas()).toEqual([]);
    await banco.db.delete(questaoSuspensa).where(eq(questaoSuspensa.questaoId, q));
    expect(await servidas()).toEqual([q]);
  });

  it('mantém o filtro de legibilidade: alternativa quebrada, curta, ou figura sem imagem', async () => {
    const ok = await questao('Enunciado legível.');
    await questao('Fração quebrada.', { alternativas: ['1\n2', ...ALTERNATIVAS.slice(1)] });
    await questao('Alternativa curta.', { alternativas: ['ab', ...ALTERNATIVAS.slice(1)] });
    await questao('Observe o gráfico abaixo.');
    const comImagem = await questao('Observe o gráfico abaixo.', { imagemUrl: 'https://exemplo.test/g.png' });
    expect(await servidas()).toEqual([ok, comImagem].sort());
  });

  describe('idioma', () => {
    it('sem idioma informado, não serve nenhum item de língua estrangeira', async () => {
      const comum = await questao('Questão comum.');
      await questao('Item em inglês.', { idioma: 'ingles' });
      await questao('Item em espanhol.', { idioma: 'espanhol' });
      expect(await servidas()).toEqual([comum]);
      expect(await servidas(undefined)).toEqual([comum]);
    });

    it('com idioma, serve a questão comum e só a versão daquele idioma', async () => {
      const comum = await questao('Questão comum.');
      const ing = await questao('Item em inglês.', { idioma: 'ingles' });
      const esp = await questao('Item em espanhol.', { idioma: 'espanhol' });
      expect(await servidas('ingles')).toEqual([comum, ing].sort());
      expect(await servidas('espanhol')).toEqual([comum, esp].sort());
    });

    it('item do idioma escolhido, mas suspenso, continua fora', async () => {
      const ing = await questao('Item em inglês.', { idioma: 'ingles' });
      await banco.db.insert(questaoSuspensa).values({ questaoId: ing, situacao: 'anulada', motivos: ['x'] });
      expect(await servidas('ingles')).toEqual([]);
    });
  });
});

describe('questao_suspensa: estrutura e RLS', () => {
  it('RLS ligada e nenhuma policy', async () => {
    const rls = await banco.pg.query<{ relrowsecurity: boolean }>(
      `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.questao_suspensa'::regclass`,
    );
    expect(rls.rows[0]?.relrowsecurity).toBe(true);
    const policies = await banco.pg.query(`SELECT 1 FROM pg_policies WHERE tablename = 'questao_suspensa'`);
    expect(policies.rows).toHaveLength(0);
  });

  it.each([
    ['anon', null],
    ['authenticated', '11111111-0000-4000-8000-0000000000aa'],
  ])('%s não lê, não escreve e não apaga', async (_papel, uid) => {
    const q = await questao('Enunciado.');
    await banco.db.insert(questaoSuspensa).values({ questaoId: q, motivos: ['x'] });
    await expect(banco.comoUsuario(uid, (query) => query('SELECT * FROM questao_suspensa'))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      banco.comoUsuario(uid, (query) =>
        query(`INSERT INTO questao_suspensa (questao_id, motivos) VALUES ($1, ARRAY['x'])`, [q]),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      banco.comoUsuario(uid, (query) => query('DELETE FROM questao_suspensa')),
    ).rejects.toThrow(/permission denied/);
  });

  it('recusa situação fora de suspensa/anulada/arquivada', async () => {
    const q = await questao('Enunciado.');
    await expect(
      banco.pg.query(`INSERT INTO questao_suspensa (questao_id, situacao, motivos) VALUES ($1, 'aprovada', ARRAY['x'])`, [q]),
    ).rejects.toThrow(/ck_questao_suspensa_situacao/);
  });

  it('some junto com a questão apagada', async () => {
    const q = await questao('Enunciado.');
    await banco.db.insert(questaoSuspensa).values({ questaoId: q, motivos: ['x'] });
    await banco.db.delete(questoesEnem).where(eq(questoesEnem.id, q));
    const sobra = await banco.pg.query('SELECT 1 FROM questao_suspensa');
    expect(sobra.rows).toHaveLength(0);
  });

  it('a migração é idempotente (rodar de novo não falha)', async () => {
    const sql = readFileSync(join(__dirname, '../../../../supabase/migrations/0019_questao_suspensa_e_idioma.sql'), 'utf8');
    await expect(banco.pg.exec(sql)).resolves.toBeDefined();
  });
});

// ── scripts de dado ─────────────────────────────────────────────────────────
// Os scripts casam questões por `left(md5(enunciado), 8)`. Não dá para fabricar
// um enunciado com um md5 dado, então o teste troca essa expressão pelo próprio
// enunciado e semeia linhas cujo enunciado É a chave. Todo o resto do script
// (inserts, updates, conferências) roda como está.

// Scripts entregues terminam em `rollback;`. Para testar o efeito de gravar, troca
// só essa linha pelo COMMIT que o operador descomenta depois de conferir.
const commitar = (sql: string) => sql.replace(/^rollback;.*$/m, 'commit;');
const MD5 = /left\(md5\((q\.)?enunciado\), 8\)/g;
const sem_md5 = (sql: string) => sql.replace(MD5, (_m, q: string | undefined) => `${q ?? ''}enunciado`);
const chaves = (sql: string) => [...sql.matchAll(/\('([0-9a-f]{8})'/g)].map((m) => m[1]!);

describe('supabase/correcoes/01 — marcar suspensas e idioma', () => {
  const arquivo = readFileSync(join(CORRECOES, '2026-10-22_01_marcar-suspensas-e-idioma.sql'), 'utf8');

  it('num banco sem as questões, aborta com a conferência e não grava nada', async () => {
    await expect(banco.pg.exec(arquivo)).rejects.toThrow(/esperado 82 suspensas/);
    await banco.pg.exec('ROLLBACK');
    const n = await banco.pg.query('SELECT count(*)::int AS n FROM questao_suspensa');
    expect((n.rows[0] as { n: number }).n).toBe(0);
  });

  it('com as questões presentes, grava 82 (1 anulada) e 10+10 idiomas, e roda de novo sem mudar nada', async () => {
    const todas = [...new Set(chaves(arquivo))];
    for (const chave of todas) await questao(chave);
    await banco.pg.exec(sem_md5(commitar(arquivo)));
    await banco.pg.exec(sem_md5(commitar(arquivo)));
    const r = await banco.pg.query<{ situacao: string; n: number }>(
      `SELECT situacao, count(*)::int AS n FROM questao_suspensa GROUP BY situacao ORDER BY situacao`,
    );
    expect(r.rows).toEqual([
      { situacao: 'anulada', n: 1 },
      { situacao: 'suspensa', n: 81 },
    ]);
    const idiomas = await banco.pg.query<{ idioma: string; n: number }>(
      `SELECT idioma, count(*)::int AS n FROM questoes_enem WHERE idioma IS NOT NULL GROUP BY idioma ORDER BY idioma`,
    );
    // enum ordena pela ordem de declaração: ingles, espanhol
    expect(idiomas.rows).toEqual([
      { idioma: 'ingles', n: 10 },
      { idioma: 'espanhol', n: 10 },
    ]);
    // e o resultado prático: nenhuma suspensa nem item de idioma sai no sorteio
    const ids = await servidas();
    const suspensas = await banco.pg.query<{ questao_id: string }>('SELECT questao_id FROM questao_suspensa');
    for (const s of suspensas.rows) expect(ids).not.toContain(s.questao_id);
    const comIdioma = await banco.pg.query<{ id: string }>('SELECT id FROM questoes_enem WHERE idioma IS NOT NULL');
    for (const s of comIdioma.rows) expect(ids).not.toContain(s.id);
  });

  it('como entregue (rollback), não grava nada mesmo com as questões presentes', async () => {
    for (const chave of [...new Set(chaves(arquivo))]) await questao(chave);
    await banco.pg.exec(sem_md5(arquivo));
    const n = await banco.pg.query('SELECT count(*)::int AS n FROM questao_suspensa');
    const idi = await banco.pg.query('SELECT count(*)::int AS n FROM questoes_enem WHERE idioma IS NOT NULL');
    expect((n.rows[0] as { n: number }).n).toBe(0);
    expect((idi.rows[0] as { n: number }).n).toBe(0);
  });

  it('sem a migração 0019, avisa o que falta', async () => {
    const sqlSemTabela = arquivo.replace("to_regclass('public.questao_suspensa') is null", 'true');
    await expect(banco.pg.exec(sqlSemTabela)).rejects.toThrow(/aplique antes a migração 0019/);
    await banco.pg.exec('ROLLBACK');
  });
});

describe('supabase/correcoes/02 — corrigir gabarito do espanhol', () => {
  const arquivo = readFileSync(join(CORRECOES, '2026-10-22_02_corrigir-gabarito-espanhol.sql'), 'utf8');
  const trios = [...arquivo.matchAll(/\('([0-9a-f]{8})', (\d), (\d)\),?\s+--/g)].map((m) => ({
    h8: m[1]!,
    nova: Number(m[2]),
    atual: Number(m[3]),
  }));

  it('lê as 8 correções do arquivo', () => {
    expect(trios).toHaveLength(8);
    for (const t of trios) expect(t.nova).not.toBe(t.atual);
  });

  it('num banco sem as questões, aborta e não grava nada', async () => {
    await expect(banco.pg.exec(arquivo)).rejects.toThrow(/afetou 0 linhas/);
    await banco.pg.exec('ROLLBACK');
  });

  it('corrige a letra, atualiza a cópia em banco_de_itens e falha na segunda execução', async () => {
    const ids: Record<string, string> = {};
    for (const t of trios) ids[t.h8] = await questao(t.h8, { correta: t.atual, idioma: 'espanhol' });
    const copiada = trios[0]!;
    await banco.pg.query(
      `INSERT INTO banco_de_itens (id, area_conhecimento, competencia, param_a, param_b, param_c, enunciado, alternativas, gabarito)
       VALUES ($1, 'linguagens', 'SIMULADO_FACIL', 1, 0, 0.2, 'x', '[]', $2)`,
      [ids[copiada.h8], String.fromCharCode(65 + copiada.atual)],
    );

    await banco.pg.exec(sem_md5(commitar(arquivo)));

    for (const t of trios) {
      const r = await banco.pg.query<{ correta: number }>('SELECT correta FROM questoes_enem WHERE id = $1', [ids[t.h8]]);
      expect(r.rows[0]?.correta).toBe(t.nova);
    }
    const copia = await banco.pg.query<{ gabarito: string }>('SELECT gabarito FROM banco_de_itens WHERE id = $1', [ids[copiada.h8]]);
    expect(copia.rows[0]?.gabarito).toBe(String.fromCharCode(65 + copiada.nova));

    await expect(banco.pg.exec(sem_md5(commitar(arquivo)))).rejects.toThrow(/afetou 0 linhas/);
    await banco.pg.exec('ROLLBACK');
  });

  it('como entregue (rollback), não altera letra nem cópia', async () => {
    const ids: Record<string, string> = {};
    for (const t of trios) ids[t.h8] = await questao(t.h8, { correta: t.atual, idioma: 'espanhol' });
    await banco.pg.exec(sem_md5(arquivo));
    for (const t of trios) {
      const r = await banco.pg.query<{ correta: number }>('SELECT correta FROM questoes_enem WHERE id = $1', [ids[t.h8]]);
      expect(r.rows[0]?.correta).toBe(t.atual);
    }
  });
});
