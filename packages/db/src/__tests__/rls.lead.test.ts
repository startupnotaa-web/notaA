import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LeadRepositoryDb } from '../repositories/lead.repository';
import { criarBancoDeTeste, type BancoDeTeste } from '../testing/banco-de-teste';

// Leads da landing (migração 0018): RLS ligada, sem política, sem privilégio para anon e
// authenticated. Só a API (conexão de serviço, aqui o superusuário do PGlite) grava e lê.

const USUARIO = '22222222-0000-4000-8000-000000000001';
const TABELAS = ['lead_landing', 'lead_rate_limit'] as const;

let banco: BancoDeTeste;
let repo: LeadRepositoryDb;

const lead = (email: string, origem: 'contato' | 'demo' = 'demo') => ({
  origem,
  nome: 'Ana',
  email,
  organizacao: origem === 'demo' ? 'Colégio X' : null,
  perfil: origem === 'contato' ? ('gestor' as const) : null,
  versaoPolitica: 'rascunho-2026-10',
});

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  repo = new LeadRepositoryDb(banco.db);
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

describe('RLS e privilégios das tabelas de lead', () => {
  it.each(TABELAS)('%s tem RLS ligada', async (tabela) => {
    const { rows } = await banco.pg.query<{ relrowsecurity: boolean }>(
      `SELECT relrowsecurity FROM pg_class WHERE relname = $1`,
      [tabela],
    );
    expect(rows[0]?.relrowsecurity).toBe(true);
  });

  it.each(TABELAS)('%s: anon e authenticated não leem nem escrevem', async (tabela) => {
    await repo.registrar(lead('ja-existe@escola.test'));
    for (const uid of [null, USUARIO]) {
      await expect(banco.comoUsuario(uid, (q) => q(`SELECT * FROM ${tabela}`))).rejects.toThrow(/permission denied/);
      await expect(
        banco.comoUsuario(uid, (q) =>
          tabela === 'lead_landing'
            ? q(`INSERT INTO lead_landing (origem, nome, email, versao_politica) VALUES ('demo', 'x', 'x@x.test', 'v')`)
            : q(`INSERT INTO lead_rate_limit (chave_hash, janela_inicio) VALUES ('h', now())`),
        ),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it('o banco recusa origem e perfil fora da lista', async () => {
    await expect(
      banco.pg.query(`INSERT INTO lead_landing (origem, nome, email, versao_politica) VALUES ('outra', 'x', 'o@x.test', 'v')`),
    ).rejects.toThrow(/ck_lead_landing_origem/);
    await expect(
      banco.pg.query(
        `INSERT INTO lead_landing (origem, nome, email, perfil, versao_politica) VALUES ('contato', 'x', 'p@x.test', 'admin', 'v')`,
      ),
    ).rejects.toThrow(/ck_lead_landing_perfil/);
  });
});

describe('LeadRepositoryDb', () => {
  it('grava o lead com o consentimento registrado', async () => {
    expect(await repo.registrar(lead('nova@escola.test'))).toBe('criado');
    const { rows } = await banco.pg.query<{ versao_politica: string; consentimento_em: Date }>(
      `SELECT versao_politica, consentimento_em FROM lead_landing WHERE email = 'nova@escola.test'`,
    );
    expect(rows[0]?.versao_politica).toBe('rascunho-2026-10');
    expect(rows[0]?.consentimento_em).toBeInstanceOf(Date);
  });

  it('o mesmo e-mail na mesma origem não duplica; em outra origem entra', async () => {
    expect(await repo.registrar(lead('dup@escola.test'))).toBe('criado');
    expect(await repo.registrar(lead('dup@escola.test'))).toBe('repetido');
    expect(await repo.registrar(lead('dup@escola.test', 'contato'))).toBe('criado');
    const { rows } = await banco.pg.query(`SELECT 1 FROM lead_landing WHERE email = 'dup@escola.test'`);
    expect(rows).toHaveLength(2);
  });

  it('o contador soma por chave dentro da hora', async () => {
    expect(await repo.consumirJanela('chave-a')).toBe(1);
    expect(await repo.consumirJanela('chave-a')).toBe(2);
    expect(await repo.consumirJanela('chave-b')).toBe(1);
  });

  it('o erro de gravação não carrega nome nem e-mail', async () => {
    const quebrado = { ...lead('quebrado@escola.test'), origem: 'invalida' as never };
    const erro = await repo.registrar(quebrado).catch((e: Error) => e);
    expect(erro).toBeInstanceOf(Error);
    expect((erro as Error).message).not.toContain('quebrado@escola.test');
    expect((erro as Error).message).not.toContain('Ana');
    expect((erro as Error).message).toMatch(/código/);
  });
});
