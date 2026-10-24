import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, type BancoDeTeste } from '../testing/banco-de-teste';

// audit_log é só de inserção, até para o superusuário. A única exceção é a
// limpeza de dado pessoal que versões antigas gravaram em `dados` de
// responsavel.vinculado/atualizado, feita pela função anonimizar_pii_audit_log().
// Estes testes provam que a exceção é estreita.

const INST = '0000000a-0000-4000-8000-000000000000';
const GESTOR = '11111111-0000-4000-8000-000000000001';
const ALUNO = 'ca0000a1-0000-4000-8000-000000000000';

let banco: BancoDeTeste;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await banco.pg.exec(`
    INSERT INTO instituicao (id, nome) VALUES ('${INST}', 'A');
    INSERT INTO usuario (id, auth_uid, tipo_perfil, email, status, instituicao_id, funcao_instituicao)
      VALUES ('${GESTOR}', '${GESTOR}', 'admin_instituicao', 'g@a.test', 'ativo', '${INST}', 'gestor');
  `);
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

/** Linhas como as versões antigas gravavam: com e-mail, matrícula e o registro anterior. */
async function semearLinhasAntigas(): Promise<string[]> {
  const ids: string[] = [];
  const antiga = [
    ['responsavel.vinculado', { importacaoId: 'i1', matricula: 'M-1', email: 'mae@x.test', usuarioId: 'u1' }],
    [
      'responsavel.atualizado',
      {
        importacaoId: 'i1',
        matricula: 'M-1',
        email: 'mae@x.test',
        usuarioId: null,
        antes: { id: 'r1', nome: 'Maria', email: 'mae@x.test', telefone: '11999990000', parentesco: 'mãe' },
      },
    ],
    ['regra.criada', { anoLetivoId: 'a1', versao: 1 }],
  ] as const;
  for (const [acao, dados] of antiga) {
    const { rows } = await banco.pg.query<{ id: string }>(
      `INSERT INTO audit_log (instituicao_id, ator_id, papel, acao, entidade, entidade_id, dados)
       VALUES ($1, $2, 'admin_instituicao', $3, 'aluno_instituicao', $4, $5::jsonb) RETURNING id`,
      [INST, GESTOR, acao, ALUNO, JSON.stringify(dados)],
    );
    ids.push(rows[0]!.id);
  }
  return ids;
}

describe('anonimizar_pii_audit_log()', () => {
  it('tira o dado pessoal de responsavel.vinculado/atualizado e deixa o resto como está', async () => {
    const [vinculado, atualizado, regra] = await semearLinhasAntigas();
    const antes = await banco.pg.query('SELECT * FROM audit_log WHERE id = $1', [regra]);

    const { rows } = await banco.pg.query<{ n: number }>('SELECT anonimizar_pii_audit_log() AS n');
    expect(rows[0]!.n).toBeGreaterThanOrEqual(2);

    const { rows: limpas } = await banco.pg.query<{ id: string; dados: Record<string, unknown> }>(
      'SELECT id, dados FROM audit_log WHERE id = ANY($1)',
      [[vinculado, atualizado]],
    );
    for (const l of limpas) {
      expect(JSON.stringify(l.dados)).not.toMatch(/@|11999990000|Maria|M-1/);
      for (const chave of ['email', 'matricula', 'antes', 'usuarioId', 'nome', 'telefone']) {
        expect(l.dados).not.toHaveProperty(chave);
      }
      expect(l.dados).toHaveProperty('importacaoId', 'i1');
    }
    // Outras ações e todas as outras colunas ficam intactas.
    expect((await banco.pg.query('SELECT * FROM audit_log WHERE id = $1', [regra])).rows).toEqual(antes.rows);
    const { rows: colunas } = await banco.pg.query<{ acao: string; ator_id: string; criado_em: Date }>(
      'SELECT acao, ator_id, criado_em FROM audit_log WHERE id = $1',
      [vinculado],
    );
    expect(colunas[0]).toMatchObject({ acao: 'responsavel.vinculado', ator_id: GESTOR });
  });

  it('registra a própria execução, sem dado pessoal', async () => {
    await semearLinhasAntigas();
    const { rows: r } = await banco.pg.query<{ n: number }>('SELECT anonimizar_pii_audit_log() AS n');
    const { rows } = await banco.pg.query<{ dados: Record<string, unknown> }>(
      `SELECT dados FROM audit_log WHERE acao = 'audit_log.anonimizado' ORDER BY criado_em DESC, id LIMIT 1`,
    );
    expect(rows[0]!.dados).toMatchObject({ linhas: r[0]!.n });
    expect(JSON.stringify(rows[0]!.dados)).not.toMatch(/@/);
  });

  it('é idempotente: sem nada a limpar, não muda nem registra nada', async () => {
    await banco.pg.query('SELECT anonimizar_pii_audit_log()');
    const antes = (await banco.pg.query('SELECT count(*)::int AS n FROM audit_log')).rows;
    const { rows } = await banco.pg.query<{ n: number }>('SELECT anonimizar_pii_audit_log() AS n');
    expect(rows[0]!.n).toBe(0);
    expect((await banco.pg.query('SELECT count(*)::int AS n FROM audit_log')).rows).toEqual(antes);
  });

  it('authenticated e anon não executam a função', async () => {
    for (const uid of [GESTOR, null]) {
      await expect(
        banco.comoUsuario(uid, (q) => q('SELECT anonimizar_pii_audit_log()')),
      ).rejects.toThrow(/permission denied/);
    }
  });
});

describe('o bloqueio geral do audit_log continua de pé', () => {
  it('UPDATE direto, mesmo do superusuário, falha', async () => {
    const [id] = await semearLinhasAntigas();
    await expect(
      banco.pg.query(`UPDATE audit_log SET dados = '{}'::jsonb WHERE id = $1`, [id]),
    ).rejects.toThrow(/só de inserção/);
  });

  it('ligar o GUC à mão e mudar OUTRA coluna falha', async () => {
    const [id] = await semearLinhasAntigas();
    await expect(
      banco.pg.transaction(async (tx) => {
        await tx.query(`SELECT set_config('notaa.anonimizando', 'on', true)`);
        await tx.query(`UPDATE audit_log SET ator_id = NULL WHERE id = $1`, [id]);
      }),
    ).rejects.toThrow(/só de inserção/);
    await expect(
      banco.pg.transaction(async (tx) => {
        await tx.query(`SELECT set_config('notaa.anonimizando', 'on', true)`);
        await tx.query(`UPDATE audit_log SET acao = 'outra.coisa' WHERE id = $1`, [id]);
      }),
    ).rejects.toThrow(/só de inserção/);
  });

  it('ligar o GUC à mão e mudar `dados` de OUTRA ação falha', async () => {
    const [, , regra] = await semearLinhasAntigas();
    await expect(
      banco.pg.transaction(async (tx) => {
        await tx.query(`SELECT set_config('notaa.anonimizando', 'on', true)`);
        await tx.query(`UPDATE audit_log SET dados = '{}'::jsonb WHERE id = $1`, [regra]);
      }),
    ).rejects.toThrow(/só de inserção/);
  });

  it('o GUC não vaza para fora da transação da função', async () => {
    await banco.pg.query('SELECT anonimizar_pii_audit_log()');
    const { rows } = await banco.pg.query<{ v: string | null }>(`SELECT current_setting('notaa.anonimizando', true) AS v`);
    expect(rows[0]!.v === null || rows[0]!.v === '' || rows[0]!.v === 'off').toBe(true);
    const [id] = await semearLinhasAntigas();
    await expect(banco.pg.query(`UPDATE audit_log SET dados = '{}'::jsonb WHERE id = $1`, [id])).rejects.toThrow(
      /só de inserção/,
    );
  });

  it('DELETE e TRUNCATE continuam barrados', async () => {
    await expect(banco.pg.query('DELETE FROM audit_log')).rejects.toThrow(/só de inserção/);
    await expect(banco.pg.query('TRUNCATE audit_log CASCADE')).rejects.toThrow(/só de inserção/);
  });
});
