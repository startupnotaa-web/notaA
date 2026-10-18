import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InstituicaoRepositoryDb } from '../repositories/instituicao.repository';
import { criarBancoDeTeste, type BancoDeTeste } from '../testing/banco-de-teste';

// Dois fechamentos de menor privilégio da Gestão Acadêmica:
// 1. admin de instituição sem função gravada é COORDENAÇÃO (o menos privilegiado);
//    gestor só quando gravado de propósito.
// 2. as tabelas da Gestão Acadêmica não aceitam escrita direta de anon nem de
//    authenticated, nem por privilégio, mesmo que alguém crie uma política de escrita.

const INST = '0000000a-0000-4000-8000-000000000000';
const SEM_FUNCAO = '11111111-0000-4000-8000-000000000001';
const GESTOR = '11111111-0000-4000-8000-000000000002';
const NOVO_ADMIN = '11111111-0000-4000-8000-000000000003';

const TABELAS = [
  'regra_avaliativa',
  'regra_avaliativa_ativacao',
  'periodo_avaliativo',
  'disciplina',
  'turma_disciplina',
  'aluno_instituicao',
  'responsavel_aluno',
  'importacao',
  'audit_log',
  'convite_responsavel',
  'consentimento_responsavel',
] as const;

let banco: BancoDeTeste;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await banco.pg.exec(`
    INSERT INTO instituicao (id, nome) VALUES ('${INST}', 'A');
    INSERT INTO usuario (id, auth_uid, tipo_perfil, email, status, instituicao_id, funcao_instituicao) VALUES
      ('${SEM_FUNCAO}', '${SEM_FUNCAO}', 'admin_instituicao', 'sem@a.test', 'ativo', '${INST}', NULL),
      ('${GESTOR}', '${GESTOR}', 'admin_instituicao', 'g@a.test', 'ativo', '${INST}', 'gestor'),
      ('${NOVO_ADMIN}', '${NOVO_ADMIN}', 'admin_instituicao', 'novo@x.test', 'ativo', NULL, NULL);
    INSERT INTO audit_log (instituicao_id, ator_id, papel, acao, entidade)
      VALUES ('${INST}', '${GESTOR}', 'admin_instituicao', 'regra.criada', 'regra_avaliativa');
  `);
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

const linhasDeAuditoria = (uid: string) =>
  banco.comoUsuario(uid, (q) => q('SELECT 1 FROM audit_log')).then((r) => r.rows.length);

describe('função padrão: coordenação', () => {
  it('admin sem função gravada não lê a auditoria; o gestor lê', async () => {
    expect(await linhasDeAuditoria(SEM_FUNCAO)).toBe(0);
    expect(await linhasDeAuditoria(GESTOR)).toBe(1);
  });

  it('virar gestor é um ato explícito', async () => {
    await banco.pg.query(`UPDATE usuario SET funcao_instituicao = 'gestor' WHERE id = $1`, [SEM_FUNCAO]);
    expect(await linhasDeAuditoria(SEM_FUNCAO)).toBe(1);
    await banco.pg.query(`UPDATE usuario SET funcao_instituicao = NULL WHERE id = $1`, [SEM_FUNCAO]);
  });

  it('quem cria a instituição no cadastro nasce gestor (a gravação é explícita)', async () => {
    const criada = await new InstituicaoRepositoryDb(banco.db).criarParaAdmin({
      nome: 'Nova instituição',
      adminId: NOVO_ADMIN,
    });
    const { rows } = await banco.pg.query<{ funcao_instituicao: string; instituicao_id: string }>(
      'SELECT funcao_instituicao, instituicao_id FROM usuario WHERE id = $1',
      [NOVO_ADMIN],
    );
    expect(rows[0]).toEqual({ funcao_instituicao: 'gestor', instituicao_id: criada.id });
  });
});

describe('privilégios de escrita', () => {
  const operacoes = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] as const;
  const casos = (['anon', 'authenticated'] as const).flatMap((papel) =>
    TABELAS.flatMap((tabela) => operacoes.map((op) => [papel, tabela, op] as const)),
  );

  it.each(casos)('%s não tem %s privilégio em %s... (papel, tabela, operação)', async (papel, tabela, op) => {
    const { rows } = await banco.pg.query<{ tem: boolean }>(
      `SELECT has_table_privilege($1, $2, $3) AS tem`,
      [papel, `public.${tabela}`, op],
    );
    expect(rows[0]!.tem, `${papel} ${op} ${tabela}`).toBe(false);
  });

  it('a leitura continua com authenticated (quem filtra é a RLS)', async () => {
    for (const tabela of TABELAS) {
      const { rows } = await banco.pg.query<{ tem: boolean }>(`SELECT has_table_privilege('authenticated', $1, 'SELECT') AS tem`, [
        `public.${tabela}`,
      ]);
      expect(rows[0]!.tem, tabela).toBe(true);
    }
  });
});
