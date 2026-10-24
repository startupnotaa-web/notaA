import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, type BancoDeTeste } from '../testing/banco-de-teste';

// RLS das tabelas da Gestão Acadêmica (migração 0015), por papel.
// O banco é PGlite em memória com as migrações reais; os dados são semeados
// como superusuário (que ignora RLS) e lidos como `authenticated`.

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
  'solicitacao_vinculo_responsavel',
] as const;
type Tabela = (typeof TABELAS)[number];

// Ids fixos para as asserções ficarem legíveis.
const INST_A = '0000000a-0000-4000-8000-000000000000';
const INST_B = '0000000b-0000-4000-8000-000000000000';
const ANO = '00000a00-0000-4000-8000-000000000000';
const TURMA_A1 = '000000a1-0000-4000-8000-000000000000';
const TURMA_A2 = '000000a2-0000-4000-8000-000000000000';
const TURMA_B1 = '000000b1-0000-4000-8000-000000000000';
const DISC_A = 'd000000a-0000-4000-8000-000000000000';
const DISC_B = 'd000000b-0000-4000-8000-000000000000';
const REGRA_A = 'e000000a-0000-4000-8000-000000000000';
const REGRA_B = 'e000000b-0000-4000-8000-000000000000';
const ALUNO_CAD_A1 = 'ca0000a1-0000-4000-8000-000000000000'; // cadastro ligado à conta do aluno
const ALUNO_CAD_A2 = 'ca0000a2-0000-4000-8000-000000000000'; // filho do responsável, outra turma
const ALUNO_CAD_B = 'ca00000b-0000-4000-8000-000000000000';
const RESP_A = 'aa0000a1-0000-4000-8000-000000000000'; // contato do responsável com conta e consentimento
const RESP_SEM_CONSENTIMENTO = 'aa0000a2-0000-4000-8000-000000000000';
const RESP_B = 'aa00000b-0000-4000-8000-000000000000';

// Usuários: em produção id = auth_uid (auth.service), aqui também.
const U = {
  gestorA: '11111111-0000-4000-8000-000000000001',
  coordA: '11111111-0000-4000-8000-000000000002',
  profA: '11111111-0000-4000-8000-000000000003',
  alunoA: '11111111-0000-4000-8000-000000000004',
  respA: '11111111-0000-4000-8000-000000000005',
  gestorB: '11111111-0000-4000-8000-000000000006',
  profIndependente: '11111111-0000-4000-8000-000000000007',
  respSemConsentimento: '11111111-0000-4000-8000-000000000008',
} as const;

const SEMENTE = `
  INSERT INTO instituicao (id, nome) VALUES ('${INST_A}', 'Instituição A'), ('${INST_B}', 'Instituição B');
  INSERT INTO usuario (id, auth_uid, tipo_perfil, email, status, instituicao_id, funcao_instituicao) VALUES
    ('${U.gestorA}', '${U.gestorA}', 'admin_instituicao', 'gestor@a.test', 'ativo', '${INST_A}', 'gestor'),
    ('${U.coordA}', '${U.coordA}', 'admin_instituicao', 'coord@a.test', 'ativo', '${INST_A}', 'coordenacao'),
    ('${U.profA}', '${U.profA}', 'professor_institucional', 'prof@a.test', 'ativo', '${INST_A}', NULL),
    ('${U.alunoA}', '${U.alunoA}', 'estudante', 'aluno@a.test', 'ativo', NULL, NULL),
    ('${U.respA}', '${U.respA}', 'responsavel', 'resp@a.test', 'ativo', NULL, NULL),
    ('${U.gestorB}', '${U.gestorB}', 'admin_instituicao', 'gestor@b.test', 'ativo', '${INST_B}', 'gestor'),
    ('${U.profIndependente}', '${U.profIndependente}', 'professor_independente', 'indep@x.test', 'ativo', NULL, NULL),
    ('${U.respSemConsentimento}', '${U.respSemConsentimento}', 'responsavel', 'semc@a.test', 'ativo', NULL, NULL);
  INSERT INTO ano_letivo (id, rotulo) VALUES ('${ANO}', '2026');
  INSERT INTO turma (id, instituicao_id, ano_letivo_id, nome) VALUES
    ('${TURMA_A1}', '${INST_A}', '${ANO}', '1A'),
    ('${TURMA_A2}', '${INST_A}', '${ANO}', '1B'),
    ('${TURMA_B1}', '${INST_B}', '${ANO}', '1A');
  INSERT INTO professor_turma (turma_id, professor_id) VALUES ('${TURMA_A1}', '${U.profA}');
  INSERT INTO matricula_turma (turma_id, estudante_id, status, aprovado_em)
    VALUES ('${TURMA_A1}', '${U.alunoA}', 'ativa', now());

  INSERT INTO regra_avaliativa (id, instituicao_id, ano_letivo_id, versao, regra, criado_por) VALUES
    ('${REGRA_A}', '${INST_A}', '${ANO}', 1, '{"v":1}', '${U.gestorA}'),
    ('${REGRA_B}', '${INST_B}', '${ANO}', 1, '{"v":1}', '${U.gestorB}');
  INSERT INTO regra_avaliativa_ativacao (regra_id, instituicao_id, ano_letivo_id, ativado_por) VALUES
    ('${REGRA_A}', '${INST_A}', '${ANO}', '${U.gestorA}'),
    ('${REGRA_B}', '${INST_B}', '${ANO}', '${U.gestorB}');
  INSERT INTO periodo_avaliativo (instituicao_id, ano_letivo_id, ordem, nome, data_inicio, data_fim) VALUES
    ('${INST_A}', '${ANO}', 1, '1º bimestre', '2026-02-01', '2026-04-15'),
    ('${INST_B}', '${ANO}', 1, '1º trimestre', '2026-02-01', '2026-05-15');
  INSERT INTO disciplina (id, instituicao_id, nome, area_enem) VALUES
    ('${DISC_A}', '${INST_A}', 'Matemática', 'matematica'),
    ('${DISC_B}', '${INST_B}', 'Matemática', 'matematica');
  INSERT INTO turma_disciplina (turma_id, disciplina_id, instituicao_id, professor_id) VALUES
    ('${TURMA_A1}', '${DISC_A}', '${INST_A}', '${U.profA}'),
    ('${TURMA_A2}', '${DISC_A}', '${INST_A}', NULL),
    ('${TURMA_B1}', '${DISC_B}', '${INST_B}', NULL);
  INSERT INTO aluno_instituicao (id, instituicao_id, matricula, nome, turma_id, usuario_id) VALUES
    ('${ALUNO_CAD_A1}', '${INST_A}', 'A-001', 'Aluno da 1A', '${TURMA_A1}', '${U.alunoA}'),
    ('${ALUNO_CAD_A2}', '${INST_A}', 'A-002', 'Filho do responsável', '${TURMA_A2}', NULL),
    ('${ALUNO_CAD_B}', '${INST_B}', 'B-001', 'Aluno da B', '${TURMA_B1}', NULL);
  INSERT INTO responsavel_aluno (id, instituicao_id, aluno_instituicao_id, nome, email, usuario_id) VALUES
    ('${RESP_A}', '${INST_A}', '${ALUNO_CAD_A2}', 'Responsável', 'resp@a.test', '${U.respA}'),
    ('${RESP_SEM_CONSENTIMENTO}', '${INST_A}', '${ALUNO_CAD_A1}', 'Outra pessoa', 'outra@a.test', '${U.respSemConsentimento}'),
    ('${RESP_B}', '${INST_B}', '${ALUNO_CAD_B}', 'Responsável B', 'resp@b.test', NULL);
  INSERT INTO convite_responsavel (instituicao_id, responsavel_aluno_id, token_hash, expira_em, usado_em, usado_por, criado_por) VALUES
    ('${INST_A}', '${RESP_A}', 'hash-a', now() + interval '7 days', now(), '${U.respA}', '${U.gestorA}'),
    ('${INST_B}', '${RESP_B}', 'hash-b', now() + interval '7 days', NULL, NULL, '${U.gestorB}');
  INSERT INTO consentimento_responsavel (instituicao_id, responsavel_aluno_id, usuario_id, versao_termo) VALUES
    ('${INST_A}', '${RESP_A}', '${U.respA}', '2026-10-v1');
  -- Tentativa de vínculo com e-mail diferente, à espera da coordenação: o solicitante
  -- é a conta U.respSemConsentimento, em cada instituição.
  INSERT INTO convite_responsavel (instituicao_id, responsavel_aluno_id, token_hash, expira_em, usado_em, usado_por, criado_por) VALUES
    ('${INST_A}', '${RESP_SEM_CONSENTIMENTO}', 'hash-pend-a', now() + interval '7 days', now(), '${U.respSemConsentimento}', '${U.gestorA}');
  INSERT INTO solicitacao_vinculo_responsavel (instituicao_id, responsavel_aluno_id, convite_id, usuario_id, versao_termo, email_conta)
    SELECT instituicao_id, responsavel_aluno_id, id, '${U.respSemConsentimento}', '2026-10-v1', 'outro@y.test'
      FROM convite_responsavel WHERE token_hash = 'hash-pend-a';
  INSERT INTO solicitacao_vinculo_responsavel (instituicao_id, responsavel_aluno_id, convite_id, usuario_id, versao_termo, email_conta)
    SELECT instituicao_id, responsavel_aluno_id, id, '${U.respSemConsentimento}', '2026-10-v1', 'outro@y.test'
      FROM convite_responsavel WHERE token_hash = 'hash-b';
  INSERT INTO importacao (instituicao_id, tipo, nome_arquivo, arquivo_path, criado_por) VALUES
    ('${INST_A}', 'alunos', 'a.csv', '${INST_A}/x', '${U.gestorA}'),
    ('${INST_B}', 'alunos', 'b.csv', '${INST_B}/y', '${U.gestorB}');
  INSERT INTO audit_log (instituicao_id, ator_id, papel, acao, entidade) VALUES
    ('${INST_A}', '${U.gestorA}', 'admin_instituicao', 'regra.criada', 'regra_avaliativa'),
    ('${INST_B}', '${U.gestorB}', 'admin_instituicao', 'regra.criada', 'regra_avaliativa');
`;

// Quem NÃO deveria ler nada da instituição A, por motivos diferentes.
const X = {
  alunoSemMatricula: '22222222-0000-4000-8000-000000000001',
  alunoPendente: '22222222-0000-4000-8000-000000000002',
  alunoRecusado: '22222222-0000-4000-8000-000000000003',
  alunoRemovido: '22222222-0000-4000-8000-000000000004',
  alunoB: '22222222-0000-4000-8000-000000000005',
  respSemVinculo: '22222222-0000-4000-8000-000000000006',
  respB: '22222222-0000-4000-8000-000000000007',
} as const;

const SEMENTE_SEM_VINCULO = `
  INSERT INTO usuario (id, auth_uid, tipo_perfil, email, status) VALUES
    ('${X.alunoSemMatricula}', '${X.alunoSemMatricula}', 'estudante', 'sem@x.test', 'ativo'),
    ('${X.alunoPendente}', '${X.alunoPendente}', 'estudante', 'pend@x.test', 'ativo'),
    ('${X.alunoRecusado}', '${X.alunoRecusado}', 'estudante', 'rec@x.test', 'ativo'),
    ('${X.alunoRemovido}', '${X.alunoRemovido}', 'estudante', 'rem@x.test', 'ativo'),
    ('${X.alunoB}', '${X.alunoB}', 'estudante', 'aluno@b.test', 'ativo'),
    ('${X.respSemVinculo}', '${X.respSemVinculo}', 'responsavel', 'solto@x.test', 'ativo'),
    ('${X.respB}', '${X.respB}', 'responsavel', 'resp2@b.test', 'ativo');
  INSERT INTO matricula_turma (turma_id, estudante_id, status, aprovado_em) VALUES
    ('${TURMA_A1}', '${X.alunoPendente}', 'pendente', NULL),
    ('${TURMA_A1}', '${X.alunoRecusado}', 'recusada', NULL),
    ('${TURMA_A1}', '${X.alunoRemovido}', 'removida', now()),
    ('${TURMA_B1}', '${X.alunoB}', 'ativa', now());
  UPDATE responsavel_aluno SET usuario_id = '${X.respB}' WHERE email = 'resp@b.test';
`;

let banco: BancoDeTeste;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await banco.pg.exec(SEMENTE);
  await banco.pg.exec(SEMENTE_SEM_VINCULO);
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

/** Quantas linhas de cada tabela o usuário enxerga, separadas por instituição. */
async function visao(authUid: string | null): Promise<Record<Tabela, { a: number; b: number }>> {
  return banco.comoUsuario(authUid, async (query) => {
    const resultado = {} as Record<Tabela, { a: number; b: number }>;
    for (const tabela of TABELAS) {
      const { rows } = await query<{ a: number; b: number }>(
        `SELECT count(*) FILTER (WHERE instituicao_id = $1)::int AS a,
                count(*) FILTER (WHERE instituicao_id = $2)::int AS b
           FROM ${tabela}`,
        [INST_A, INST_B],
      );
      resultado[tabela] = rows[0]!;
    }
    return resultado;
  });
}

describe('RLS da Gestão Acadêmica', () => {
  it('gestor lê todas as linhas da própria instituição e nenhuma da outra', async () => {
    expect(await visao(U.gestorA)).toEqual({
      regra_avaliativa: { a: 1, b: 0 },
      regra_avaliativa_ativacao: { a: 1, b: 0 },
      periodo_avaliativo: { a: 1, b: 0 },
      disciplina: { a: 1, b: 0 },
      turma_disciplina: { a: 2, b: 0 },
      aluno_instituicao: { a: 2, b: 0 },
      responsavel_aluno: { a: 2, b: 0 },
      importacao: { a: 1, b: 0 },
      audit_log: { a: 1, b: 0 },
      convite_responsavel: { a: 2, b: 0 },
      consentimento_responsavel: { a: 1, b: 0 },
      solicitacao_vinculo_responsavel: { a: 1, b: 0 },
    });
  });

  it('coordenação lê como o gestor, menos a auditoria', async () => {
    const v = await visao(U.coordA);
    expect(v.audit_log).toEqual({ a: 0, b: 0 });
    expect(v.aluno_instituicao).toEqual({ a: 2, b: 0 });
    expect(v.importacao).toEqual({ a: 1, b: 0 });
    expect(v.regra_avaliativa).toEqual({ a: 1, b: 0 });
    expect(v.convite_responsavel).toEqual({ a: 2, b: 0 });
    expect(v.consentimento_responsavel).toEqual({ a: 1, b: 0 });
    expect(v.solicitacao_vinculo_responsavel).toEqual({ a: 1, b: 0 });
  });

  it('professor lê a configuração da instituição e só o cadastro das turmas dele', async () => {
    expect(await visao(U.profA)).toEqual({
      regra_avaliativa: { a: 1, b: 0 },
      regra_avaliativa_ativacao: { a: 1, b: 0 },
      periodo_avaliativo: { a: 1, b: 0 },
      disciplina: { a: 1, b: 0 },
      turma_disciplina: { a: 1, b: 0 },
      aluno_instituicao: { a: 1, b: 0 },
      responsavel_aluno: { a: 0, b: 0 },
      importacao: { a: 0, b: 0 },
      audit_log: { a: 0, b: 0 },
      convite_responsavel: { a: 0, b: 0 },
      consentimento_responsavel: { a: 0, b: 0 },
      solicitacao_vinculo_responsavel: { a: 0, b: 0 },
    });
  });

  it('aluno lê a configuração da instituição em que está matriculado e o próprio cadastro', async () => {
    expect(await visao(U.alunoA)).toEqual({
      regra_avaliativa: { a: 1, b: 0 },
      regra_avaliativa_ativacao: { a: 1, b: 0 },
      periodo_avaliativo: { a: 1, b: 0 },
      disciplina: { a: 1, b: 0 },
      turma_disciplina: { a: 0, b: 0 },
      aluno_instituicao: { a: 1, b: 0 },
      responsavel_aluno: { a: 0, b: 0 },
      importacao: { a: 0, b: 0 },
      audit_log: { a: 0, b: 0 },
      convite_responsavel: { a: 0, b: 0 },
      consentimento_responsavel: { a: 0, b: 0 },
      solicitacao_vinculo_responsavel: { a: 0, b: 0 },
    });
  });

  it('responsável lê o próprio registro e o próprio consentimento, e NÃO lê a tabela do aluno', async () => {
    const v = await visao(U.respA);
    expect(v).toEqual({
      regra_avaliativa: { a: 0, b: 0 },
      regra_avaliativa_ativacao: { a: 0, b: 0 },
      periodo_avaliativo: { a: 0, b: 0 },
      disciplina: { a: 0, b: 0 },
      turma_disciplina: { a: 0, b: 0 },
      // O cadastro do aluno tem data de nascimento e e-mail: o responsável só o vê pela view.
      aluno_instituicao: { a: 0, b: 0 },
      responsavel_aluno: { a: 1, b: 0 },
      importacao: { a: 0, b: 0 },
      audit_log: { a: 0, b: 0 },
      convite_responsavel: { a: 0, b: 0 },
      consentimento_responsavel: { a: 1, b: 0 },
      solicitacao_vinculo_responsavel: { a: 0, b: 0 },
    });
  });

  it('usuário de outra instituição não lê nenhuma linha das tabelas novas', async () => {
    const v = await visao(U.gestorB);
    for (const tabela of TABELAS) {
      expect(v[tabela].a, tabela).toBe(0);
    }
    // E enxerga a própria, para provar que a consulta funciona.
    expect(v.aluno_instituicao.b).toBe(1);
  });

  it('professor independente não lê nada', async () => {
    const v = await visao(U.profIndependente);
    for (const tabela of TABELAS) {
      expect(v[tabela], tabela).toEqual({ a: 0, b: 0 });
    }
  });

  it.each(TABELAS)('anônimo é barrado em %s antes de ver qualquer linha', async (tabela) => {
    // Os helpers de RLS só têm EXECUTE para `authenticated`: para `anon` a
    // política nem chega a avaliar, a consulta falha.
    await expect(
      banco.comoUsuario(null, (query) => query(`SELECT count(*) FROM ${tabela}`)),
    ).rejects.toThrow(/permission denied/);
  });

  it('nenhum papel escreve direto nas tabelas novas: falta até o privilégio', async () => {
    for (const tabela of ['disciplina', 'aluno_instituicao', 'importacao'] as const) {
      await expect(
        banco.comoUsuario(U.gestorA, (query) =>
          query(`UPDATE ${tabela} SET atualizado_em = now() WHERE instituicao_id = $1`, [INST_A]),
        ),
        tabela,
      ).rejects.toThrow(/permission denied/);
    }
    await expect(
      banco.comoUsuario(U.gestorA, (query) =>
        query(`INSERT INTO disciplina (instituicao_id, nome) VALUES ($1, 'Física')`, [INST_A]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('tabelas só de inserção', () => {
  it.each(['regra_avaliativa', 'regra_avaliativa_ativacao', 'audit_log', 'consentimento_responsavel'])(
    '%s recusa UPDATE, DELETE e TRUNCATE até para o superusuário',
    async (tabela) => {
      const coluna =
        tabela === 'regra_avaliativa_ativacao' ? 'ativado_em' : tabela === 'consentimento_responsavel' ? 'aceito_em' : 'criado_em';
      await expect(banco.pg.query(`UPDATE ${tabela} SET ${coluna} = now()`)).rejects.toThrow(
        /só de inserção/,
      );
      await expect(banco.pg.query(`DELETE FROM ${tabela}`)).rejects.toThrow(/só de inserção/);
      await expect(banco.pg.query(`TRUNCATE ${tabela} CASCADE`)).rejects.toThrow(/só de inserção/);
    },
  );

  it('authenticated não tem nem o privilégio de escrever nelas', async () => {
    await expect(
      banco.comoUsuario(U.gestorA, (query) =>
        query(
          `INSERT INTO audit_log (instituicao_id, acao, entidade) VALUES ($1, 'x', 'y')`,
          [INST_A],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('versão nova não altera a anterior', async () => {
    const antes = await banco.pg.query(`SELECT * FROM regra_avaliativa WHERE id = $1`, [REGRA_A]);
    await banco.pg.query(
      `INSERT INTO regra_avaliativa (instituicao_id, ano_letivo_id, versao, regra, criado_por)
       VALUES ($1, $2, 2, '{"v":2}', $3)`,
      [INST_A, ANO, U.gestorA],
    );
    const depois = await banco.pg.query(`SELECT * FROM regra_avaliativa WHERE id = $1`, [REGRA_A]);
    expect(depois.rows).toEqual(antes.rows);
    await expect(
      banco.pg.query(
        `INSERT INTO regra_avaliativa (instituicao_id, ano_letivo_id, versao, regra, criado_por)
         VALUES ($1, $2, 2, '{}', $3)`,
        [INST_A, ANO, U.gestorA],
      ),
    ).rejects.toThrow(/uq_regra_avaliativa_versao/);
  });
});

describe('integridade entre instituições', () => {
  it('recusa ligar turma de uma instituição à disciplina de outra', async () => {
    await expect(
      banco.pg.query(
        `INSERT INTO turma_disciplina (turma_id, disciplina_id, instituicao_id) VALUES ($1, $2, $3)`,
        [TURMA_A1, DISC_B, INST_A],
      ),
    ).rejects.toThrow(/turma_disciplina_disciplina_escopo_fk/);
  });

  it('recusa ativar regra de outra instituição', async () => {
    await expect(
      banco.pg.query(
        `INSERT INTO regra_avaliativa_ativacao (regra_id, instituicao_id, ano_letivo_id, ativado_por)
         VALUES ($1, $2, $3, $4)`,
        [REGRA_B, INST_A, ANO, U.gestorA],
      ),
    ).rejects.toThrow(/regra_avaliativa_ativacao_regra_escopo_fk/);
  });

  it('recusa função de instituição em quem não é admin de instituição', async () => {
    await expect(
      banco.pg.query(`UPDATE usuario SET funcao_instituicao = 'gestor' WHERE id = $1`, [U.profA]),
    ).rejects.toThrow(/ck_usuario_funcao_so_admin_instituicao/);
  });
});

describe('quem não tem vínculo não lê nada da instituição A', () => {
  const SEM_VINCULO = [
    ['aluno sem nenhuma matrícula', X.alunoSemMatricula],
    ['aluno com matrícula pendente', X.alunoPendente],
    ['aluno com matrícula recusada', X.alunoRecusado],
    ['aluno com matrícula removida', X.alunoRemovido],
    ['aluno matriculado na instituição B', X.alunoB],
    ['responsável sem nenhuma linha em responsavel_aluno', X.respSemVinculo],
    ['responsável ligado a aluno da instituição B', X.respB],
  ] as const;

  it.each(SEM_VINCULO)('%s', async (_nome, uid) => {
    const v = await visao(uid);
    for (const tabela of TABELAS) {
      expect(v[tabela].a, tabela).toBe(0);
    }
  });

  it('o responsável da instituição B continua lendo o que é dele (a consulta funciona)', async () => {
    const v = await visao(X.respB);
    expect(v.responsavel_aluno).toEqual({ a: 0, b: 1 });
  });

  it('o aluno matriculado na B lê a configuração da B, não a da A', async () => {
    const v = await visao(X.alunoB);
    expect(v.periodo_avaliativo).toEqual({ a: 0, b: 1 });
    expect(v.regra_avaliativa).toEqual({ a: 0, b: 1 });
  });
});

describe('escrita direta: ninguém escreve em nenhuma tabela nova', () => {
  // Coluna de timestamp que cada tabela tem, para um UPDATE inofensivo.
  const COLUNA_DE_DATA: Record<Tabela, string> = {
    regra_avaliativa: 'criado_em',
    regra_avaliativa_ativacao: 'ativado_em',
    periodo_avaliativo: 'criado_em',
    disciplina: 'criado_em',
    turma_disciplina: 'criado_em',
    aluno_instituicao: 'criado_em',
    responsavel_aluno: 'criado_em',
    importacao: 'criado_em',
    audit_log: 'criado_em',
    convite_responsavel: 'criado_em',
    consentimento_responsavel: 'aceito_em',
    solicitacao_vinculo_responsavel: 'criado_em',
  };
  const ESCRITORES = [
    ['gestor', U.gestorA],
    ['coordenação', U.coordA],
    ['professor', U.profA],
    ['aluno', U.alunoA],
    ['responsável', U.respA],
    ['gestor de outra instituição', U.gestorB],
    ['professor independente', U.profIndependente],
    ['anônimo', null],
  ] as const;

  /** Escrita é "negada" se falha por RLS/privilégio ou se não afeta nenhuma linha. */
  async function negada(uid: string | null, sql: string): Promise<boolean> {
    try {
      const r = await banco.comoUsuario(uid, (query) => query(sql));
      return (r.affectedRows ?? 0) === 0;
    } catch (e) {
      return /row-level security|permission denied|só de inserção/.test((e as Error).message);
    }
  }

  const casos = ESCRITORES.flatMap(([nome, uid]) =>
    TABELAS.flatMap((tabela) => [
      [nome, uid, tabela, 'INSERT', `INSERT INTO ${tabela} DEFAULT VALUES`],
      [nome, uid, tabela, 'UPDATE', `UPDATE ${tabela} SET ${COLUNA_DE_DATA[tabela]} = now()`],
      [nome, uid, tabela, 'DELETE', `DELETE FROM ${tabela}`],
    ] as const),
  );

  it.each(casos)('%s não faz %s... (%s %s)', async (_nome, uid, _tabela, _op, sql) => {
    expect(await negada(uid, sql)).toBe(true);
  });

  it('o seed continua intacto depois de todas as tentativas', async () => {
    for (const tabela of TABELAS) {
      const { rows } = await banco.pg.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${tabela}`);
      expect(rows[0]!.n, tabela).toBeGreaterThan(0);
    }
  });
});

describe('responsável: consentimento e view do aluno', () => {
  const COLUNAS_DA_VIEW = ['id', 'instituicao_id', 'matricula', 'nome', 'turma_id'];

  beforeAll(async () => {
    await banco.pg.query(
      `UPDATE aluno_instituicao SET data_nascimento = '2012-05-01', email = 'filho@a.test' WHERE id = $1`,
      [ALUNO_CAD_A2],
    );
  });

  it('com consentimento, lê o aluno pela view, só com as colunas permitidas', async () => {
    const { rows, fields } = await banco.comoUsuario(U.respA, (query) =>
      query<Record<string, unknown>>('SELECT * FROM aluno_do_responsavel'),
    );
    expect(rows.map((r) => r.id)).toEqual([ALUNO_CAD_A2]);
    expect(fields.map((f) => f.name).sort()).toEqual([...COLUNAS_DA_VIEW].sort());
    expect(JSON.stringify(rows)).not.toMatch(/2012-05-01|filho@a\.test/);
  });

  it.each(['data_nascimento', 'email', 'usuario_id'])('a view não tem a coluna %s', async (coluna) => {
    await expect(
      banco.comoUsuario(U.respA, (query) => query(`SELECT ${coluna} FROM aluno_do_responsavel`)),
    ).rejects.toThrow(/does not exist/);
  });

  it('a tabela do aluno continua fechada para ele, com ou sem filtro', async () => {
    const { rows } = await banco.comoUsuario(U.respA, (query) =>
      query('SELECT data_nascimento, email FROM aluno_instituicao WHERE id = $1', [ALUNO_CAD_A2]),
    );
    expect(rows).toHaveLength(0);
  });

  it('ligado ao aluno mas SEM consentimento, não lê nada, nem pela view', async () => {
    const { rows } = await banco.comoUsuario(U.respSemConsentimento, (query) =>
      query('SELECT * FROM aluno_do_responsavel'),
    );
    expect(rows).toHaveLength(0);
    const direto = await banco.comoUsuario(U.respSemConsentimento, (query) =>
      query('SELECT * FROM aluno_instituicao'),
    );
    expect(direto.rows).toHaveLength(0);
  });

  it('o consentimento de um não vale para outro responsável do mesmo aluno', async () => {
    await banco.pg.query(
      `UPDATE responsavel_aluno SET usuario_id = $1 WHERE id = $2`,
      [U.respSemConsentimento, RESP_A],
    );
    try {
      const { rows } = await banco.comoUsuario(U.respSemConsentimento, (query) =>
        query('SELECT * FROM aluno_do_responsavel'),
      );
      // Passou a ser o responsável da linha RESP_A, mas o consentimento é de outra pessoa.
      expect(rows).toHaveLength(0);
    } finally {
      await banco.pg.query(`UPDATE responsavel_aluno SET usuario_id = $1 WHERE id = $2`, [U.respA, RESP_A]);
    }
  });

  it.each([
    ['responsável sem vínculo', X.respSemVinculo],
    ['responsável da instituição B', X.respB],
    ['gestor', U.gestorA],
    ['professor', U.profA],
    ['aluno', U.alunoA],
    ['gestor de outra instituição', U.gestorB],
  ])('%s não vê linha nenhuma na view', async (_nome, uid) => {
    const { rows } = await banco.comoUsuario(uid, (query) => query('SELECT * FROM aluno_do_responsavel'));
    expect(rows).toHaveLength(0);
  });

  it('anônimo é barrado na view', async () => {
    await expect(
      banco.comoUsuario(null, (query) => query('SELECT * FROM aluno_do_responsavel')),
    ).rejects.toThrow(/permission denied/);
  });

  it.each(['INSERT INTO aluno_do_responsavel (nome) VALUES (\'x\')', "UPDATE aluno_do_responsavel SET nome = 'x'", 'DELETE FROM aluno_do_responsavel'])(
    'a view não aceita escrita: %s',
    async (sql) => {
      await expect(banco.comoUsuario(U.respA, (query) => query(sql))).rejects.toThrow(/permission denied/);
    },
  );

  it('o nome do aluno não mudou depois de todas as tentativas', async () => {
    const { rows } = await banco.pg.query<{ nome: string }>('SELECT nome FROM aluno_instituicao WHERE id = $1', [
      ALUNO_CAD_A2,
    ]);
    expect(rows[0]!.nome).toBe('Filho do responsável');
  });
});

describe('convite e consentimento: restrições do banco', () => {
  it('o convite só aponta para responsável da mesma instituição', async () => {
    await expect(
      banco.pg.query(
        `INSERT INTO convite_responsavel (instituicao_id, responsavel_aluno_id, token_hash, expira_em, criado_por)
         VALUES ($1, $2, 'h1', now() + interval '1 day', $3)`,
        [INST_A, RESP_B, U.gestorA],
      ),
    ).rejects.toThrow(/convite_responsavel_responsavel_escopo_fk/);
  });

  it('o consentimento só aponta para responsável da mesma instituição', async () => {
    await expect(
      banco.pg.query(
        `INSERT INTO consentimento_responsavel (instituicao_id, responsavel_aluno_id, usuario_id, versao_termo)
         VALUES ($1, $2, $3, 'v-x')`,
        [INST_A, RESP_B, U.respA],
      ),
    ).rejects.toThrow(/consentimento_responsavel_responsavel_escopo_fk/);
  });

  it('o token_hash é único e o convite não nasce já expirado', async () => {
    await expect(
      banco.pg.query(
        `INSERT INTO convite_responsavel (instituicao_id, responsavel_aluno_id, token_hash, expira_em, criado_por)
         VALUES ($1, $2, 'hash-a', now() + interval '1 day', $3)`,
        [INST_A, RESP_A, U.gestorA],
      ),
    ).rejects.toThrow(/duplicate key|token_hash/);
    await expect(
      banco.pg.query(
        `INSERT INTO convite_responsavel (instituicao_id, responsavel_aluno_id, token_hash, expira_em, criado_por)
         VALUES ($1, $2, 'h2', now() - interval '1 day', $3)`,
        [INST_A, RESP_A, U.gestorA],
      ),
    ).rejects.toThrow(/ck_convite_responsavel_expiracao/);
  });

  it('a mesma versão do termo não é aceita duas vezes pelo mesmo responsável', async () => {
    await expect(
      banco.pg.query(
        `INSERT INTO consentimento_responsavel (instituicao_id, responsavel_aluno_id, usuario_id, versao_termo)
         VALUES ($1, $2, $3, '2026-10-v1')`,
        [INST_A, RESP_A, U.respA],
      ),
    ).rejects.toThrow(/duplicate key|uq_consentimento/);
  });
});

describe('usuário suspenso ou pendente não lê nada', () => {
  const QUEM = [
    ['gestor', U.gestorA],
    ['coordenação', U.coordA],
    ['professor', U.profA],
    ['aluno', U.alunoA],
    ['responsável', U.respA],
  ] as const;

  async function totalLido(uid: string): Promise<number> {
    const v = await visao(uid);
    const nasTabelas = TABELAS.reduce((soma, t) => soma + v[t].a + v[t].b, 0);
    const naView = (await banco.comoUsuario(uid, (q) => q('SELECT 1 FROM aluno_do_responsavel'))).rows.length;
    return nasTabelas + naView;
  }

  it.each(QUEM)('%s ativo lê (a consulta funciona)', async (_nome, uid) => {
    expect(await totalLido(uid)).toBeGreaterThan(0);
  });

  it.each(
    QUEM.flatMap(([nome, uid]) => (['suspenso', 'pendente'] as const).map((status) => ({ nome, uid, status }))),
  )(
    '$nome $status lê 0 linhas, em nenhuma tabela nem na view',
    async ({ uid, status }) => {
      await banco.pg.query(`UPDATE usuario SET status = $2 WHERE id = $1`, [uid, status]);
      try {
        expect(await totalLido(uid)).toBe(0);
      } finally {
        await banco.pg.query(`UPDATE usuario SET status = 'ativo' WHERE id = $1`, [uid]);
      }
    },
  );

  it('voltar a ativo devolve a leitura', async () => {
    await banco.pg.query(`UPDATE usuario SET status = 'suspenso' WHERE id = $1`, [U.gestorA]);
    expect(await totalLido(U.gestorA)).toBe(0);
    await banco.pg.query(`UPDATE usuario SET status = 'ativo' WHERE id = $1`, [U.gestorA]);
    expect(await totalLido(U.gestorA)).toBeGreaterThan(0);
  });
});

describe('função na instituição', () => {
  // As políticas de `usuario` moram em supabase/policies (aplicadas depois das
  // migrações, e a 0002 inteira não sobe num banco limpo: ainda cita `escola`).
  // Aqui vale só o trecho de `usuario`, extraído do arquivo de produção, para
  // provar que a coluna nova fica protegida por ele.
  beforeAll(async () => {
    const arquivo = readFileSync(
      join(__dirname, '../../../../supabase/policies/0002_rls_restante.sql'),
      'utf8',
    );
    const politica = arquivo.match(/create policy p_usuario_own on usuario[\s\S]*?;/i);
    expect(politica, 'p_usuario_own em 0002_rls_restante.sql').not.toBeNull();
    await banco.pg.exec('ALTER TABLE usuario ENABLE ROW LEVEL SECURITY');
    await banco.pg.exec(politica![0]);
  });

  it('authenticated não consegue mudar a própria função nem a de outro', async () => {
    for (const uid of [U.coordA, U.gestorA]) {
      const r = await banco
        .comoUsuario(uid, (query) =>
          query(`UPDATE usuario SET funcao_instituicao = 'gestor' WHERE id = $1`, [U.coordA]),
        )
        .catch((e: Error) => e);
      const negado =
        r instanceof Error ? /permission denied|row-level security/.test(r.message) : r.affectedRows === 0;
      expect(negado).toBe(true);
    }
    const { rows } = await banco.pg.query<{ funcao_instituicao: string }>(
      `SELECT funcao_instituicao FROM usuario WHERE id = $1`,
      [U.coordA],
    );
    expect(rows[0]!.funcao_instituicao).toBe('coordenacao');
  });
});

describe('solicitação de vínculo do responsável (e-mail diferente, à espera da coordenação)', () => {
  const lerComo = (uid: string) =>
    banco.comoUsuario(uid, (query) => query('SELECT id FROM solicitacao_vinculo_responsavel'));

  it('quem fez a tentativa não lê a própria solicitação: não pode saber que ela virou pendência', async () => {
    expect((await lerComo(U.respSemConsentimento)).rows).toHaveLength(0);
  });

  it('gestão e coordenação da instituição leem; outra instituição, professor e aluno não', async () => {
    expect((await lerComo(U.gestorA)).rows).toHaveLength(1);
    expect((await lerComo(U.coordA)).rows).toHaveLength(1);
    expect((await lerComo(U.gestorB)).rows).toHaveLength(1); // a da B, não a da A
    for (const uid of [U.profA, U.alunoA, U.respA, U.profIndependente]) {
      expect((await lerComo(uid)).rows, uid).toHaveLength(0);
    }
  });

  it('pendente não abre nada: a conta solicitante continua sem ler o aluno', async () => {
    const view = await banco.comoUsuario(U.respSemConsentimento, (q) => q('SELECT * FROM aluno_do_responsavel'));
    expect(view.rows).toHaveLength(0);
  });

  it('só uma pendência aberta por contato', async () => {
    await expect(
      banco.pg.query(
        `INSERT INTO solicitacao_vinculo_responsavel (instituicao_id, responsavel_aluno_id, convite_id, usuario_id, versao_termo)
         SELECT instituicao_id, responsavel_aluno_id, id, $1, '2026-10-v1' FROM convite_responsavel WHERE token_hash = 'hash-pend-a'`,
        [U.respSemConsentimento],
      ),
    ).rejects.toThrow(/uq_solicitacao_vinculo_pendente/);
  });

  it('o status só aceita os quatro valores, e decidido exige data', async () => {
    await expect(
      banco.pg.query(`UPDATE solicitacao_vinculo_responsavel SET status = 'qualquer', decidido_em = now() WHERE instituicao_id = $1`, [INST_A]),
    ).rejects.toThrow(/ck_solicitacao_vinculo_status/);
    await expect(
      banco.pg.query(
        `UPDATE solicitacao_vinculo_responsavel SET status = 'aprovada', decidido_em = NULL WHERE instituicao_id = $1`,
        [INST_A],
      ),
    ).rejects.toThrow(/ck_solicitacao_vinculo_decisao/);
  });

  it('a instituição da solicitação tem que ser a do contato e a do convite', async () => {
    await expect(
      banco.pg.query(
        `INSERT INTO solicitacao_vinculo_responsavel (instituicao_id, responsavel_aluno_id, convite_id, usuario_id, versao_termo, status, decidido_em)
         SELECT $1, responsavel_aluno_id, id, $2, '2026-10-v1', 'cancelada', now() FROM convite_responsavel WHERE token_hash = 'hash-b'`,
        [INST_A, U.respSemConsentimento],
      ),
    ).rejects.toThrow(/solicitacao_vinculo_responsavel_responsavel_escopo_fk/);
  });
});
