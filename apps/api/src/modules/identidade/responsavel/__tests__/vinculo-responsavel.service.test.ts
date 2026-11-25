import { VERSAO_TERMO_RESPONSAVEL } from '@notaa/contracts';
import { acharPiiNoAuditLog } from '@notaa/db/src/testing/audit-sem-pii';
import { criarBancoDeTeste, type BancoDeTeste } from '@notaa/db/src/testing/banco-de-teste';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EscopoService } from '../../escopo/escopo.service';
import { ConviteResponsavelService } from '../convite-responsavel.service';
import { VinculoResponsavelService } from '../vinculo-responsavel.service';

// A coordenação decide o vínculo que o e-mail não confirmou: aprovar vincula e
// consente em nome de QUEM pediu (com os dados guardados na solicitação), recusar
// não liga nada. Banco de verdade (PGlite, migrações reais).

const INST_A = '0000000a-0000-4000-8000-000000000000';
const INST_B = '0000000b-0000-4000-8000-000000000000';
const GESTOR_A = '11111111-0000-4000-8000-000000000001';
const COORD_A = '11111111-0000-4000-8000-000000000002';
const PROF_A = '11111111-0000-4000-8000-000000000003';
const ALUNO_USER = '11111111-0000-4000-8000-000000000004';
const GESTOR_B = '11111111-0000-4000-8000-000000000005';
const PEDE_1 = '11111111-0000-4000-8000-000000000006';
const PEDE_2 = '11111111-0000-4000-8000-000000000007';
const PEDE_SUSPENSO = '11111111-0000-4000-8000-000000000008';
// Conta que só tem pedidos recusados: nunca lê o aluno.
const PEDE_RECUSADO = '11111111-0000-4000-8000-000000000009';
const ALUNO_CAD = 'ca0000a1-0000-4000-8000-000000000000';

let banco: BancoDeTeste;
let convites: ConviteResponsavelService;
let servico: VinculoResponsavelService;
let sequencia = 0;

async function novoContato(): Promise<string> {
  const n = ++sequencia;
  const { rows } = await banco.pg.query<{ id: string }>(
    `INSERT INTO responsavel_aluno (instituicao_id, aluno_instituicao_id, nome, email, parentesco)
     VALUES ($1, $2, 'Mãe', $3, 'mãe') RETURNING id`,
    [INST_A, ALUNO_CAD, `mae-${n}@a.test`],
  );
  return rows[0]!.id;
}

/** Deixa uma solicitação pendente de `quem`, com e-mail diferente do cadastrado. */
async function pendencia(contato: string, quem: string, email = 'outro@y.test'): Promise<string> {
  const { token } = await convites.criarConvite(GESTOR_A, 'admin_instituicao', contato);
  await convites
    .aceitarConvite(quem, email, {
      token,
      aceitaTermo: true,
      versaoTermo: VERSAO_TERMO_RESPONSAVEL as typeof VERSAO_TERMO_RESPONSAVEL,
    })
    .catch(() => undefined);
  const { rows } = await banco.pg.query<{ id: string }>(
    `SELECT id FROM solicitacao_vinculo_responsavel WHERE responsavel_aluno_id = $1 AND status = 'pendente_aprovacao'`,
    [contato],
  );
  return rows[0]!.id;
}

const estado = async (id: string) =>
  (
    await banco.pg.query<{
      status: string;
      email_conta: string | null;
      decidido_por: string | null;
      decidido_em: Date | null;
    }>('SELECT status, email_conta, decidido_por, decidido_em FROM solicitacao_vinculo_responsavel WHERE id = $1', [id])
  ).rows[0]!;
const donoDoContato = async (contato: string) =>
  (await banco.pg.query<{ usuario_id: string | null }>('SELECT usuario_id FROM responsavel_aluno WHERE id = $1', [contato]))
    .rows[0]!.usuario_id;
const consentimentos = async (contato: string) =>
  (
    await banco.pg.query<{ usuario_id: string; versao_termo: string; aceito_em: Date; criado: Date }>(
      `SELECT c.usuario_id, c.versao_termo, c.aceito_em, s.criado_em AS criado
         FROM consentimento_responsavel c
         JOIN solicitacao_vinculo_responsavel s ON s.responsavel_aluno_id = c.responsavel_aluno_id
        WHERE c.responsavel_aluno_id = $1`,
      [contato],
    )
  ).rows;
const vistoPela = (uid: string) => banco.comoUsuario(uid, (q) => q('SELECT * FROM aluno_do_responsavel'));

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await banco.pg.exec(`
    INSERT INTO instituicao (id, nome) VALUES ('${INST_A}', 'A'), ('${INST_B}', 'B');
    INSERT INTO usuario (id, auth_uid, tipo_perfil, email, nome, status, instituicao_id, funcao_instituicao) VALUES
      ('${GESTOR_A}', '${GESTOR_A}', 'admin_instituicao', 'g@a.test', 'Gestora', 'ativo', '${INST_A}', 'gestor'),
      ('${COORD_A}', '${COORD_A}', 'admin_instituicao', 'c@a.test', 'Coord', 'ativo', '${INST_A}', 'coordenacao'),
      ('${PROF_A}', '${PROF_A}', 'professor_institucional', 'p@a.test', 'Prof', 'ativo', '${INST_A}', NULL),
      ('${ALUNO_USER}', '${ALUNO_USER}', 'estudante', 'e@x.test', 'Estudante', 'ativo', NULL, NULL),
      ('${GESTOR_B}', '${GESTOR_B}', 'admin_instituicao', 'g@b.test', 'Gestor B', 'ativo', '${INST_B}', 'gestor'),
      ('${PEDE_1}', '${PEDE_1}', 'responsavel', 'pede1@y.test', 'Pede 1', 'ativo', NULL, NULL),
      ('${PEDE_2}', '${PEDE_2}', 'responsavel', 'pede2@y.test', 'Pede 2', 'ativo', NULL, NULL),
      ('${PEDE_SUSPENSO}', '${PEDE_SUSPENSO}', 'responsavel', 'pede3@y.test', 'Pede 3', 'ativo', NULL, NULL),
      ('${PEDE_RECUSADO}', '${PEDE_RECUSADO}', 'responsavel', 'pede4@y.test', 'Pede 4', 'ativo', NULL, NULL);
    INSERT INTO aluno_instituicao (id, instituicao_id, matricula, nome, data_nascimento, email) VALUES
      ('${ALUNO_CAD}', '${INST_A}', 'A-1', 'Aluno A', '2012-05-01', 'aluno@a.test');
  `);
  const escopo = new EscopoService(banco.db);
  convites = new ConviteResponsavelService(banco.db, escopo);
  servico = new VinculoResponsavelService(banco.db, escopo);
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

let CONTATO: string;
beforeEach(async () => {
  CONTATO = await novoContato();
});

describe('listar as pendências', () => {
  it('mostra quem pede, o contato e o aluno, só da própria instituição', async () => {
    const id = await pendencia(CONTATO, PEDE_1, 'Outro@Y.test');
    const { itens } = await servico.listarPendentes(COORD_A);
    const item = itens.find((i) => i.id === id)!;
    expect(item).toMatchObject({
      emailDaConta: 'outro@y.test',
      contato: { id: CONTATO, nome: 'Mãe', parentesco: 'mãe' },
      aluno: { nome: 'Aluno A' },
    });
    expect((await servico.listarPendentes(GESTOR_B)).itens).toEqual([]);
  });

  it('não lista o que já foi decidido', async () => {
    const id = await pendencia(CONTATO, PEDE_1);
    await servico.recusar(GESTOR_A, 'admin_instituicao', id);
    expect((await servico.listarPendentes(GESTOR_A)).itens.map((i) => i.id)).not.toContain(id);
  });

  it.each([
    ['professor', PROF_A],
    ['aluno', ALUNO_USER],
    ['responsável', PEDE_1],
  ])('%s não lista', async (_n, quem) => {
    await expect(servico.listarPendentes(quem)).rejects.toMatchObject({
      response: { error: { code: 'FORA_DO_ESCOPO' } },
    });
  });
});

describe('aprovar', () => {
  it('vincula a conta que pediu, grava o consentimento dela e abre a leitura pela view', async () => {
    const id = await pendencia(CONTATO, PEDE_1);
    expect((await vistoPela(PEDE_1)).rows).toHaveLength(0);

    await expect(servico.aprovar(COORD_A, 'admin_instituicao', id)).resolves.toEqual({ status: 'aprovada' });

    expect(await donoDoContato(CONTATO)).toBe(PEDE_1);
    const consent = await consentimentos(CONTATO);
    expect(consent).toHaveLength(1);
    // O consentimento é de quem pediu, na hora em que pediu: a coordenação não consente por ninguém.
    expect(consent[0]).toMatchObject({ usuario_id: PEDE_1, versao_termo: VERSAO_TERMO_RESPONSAVEL });
    expect(consent[0]!.aceito_em.getTime()).toBe(consent[0]!.criado.getTime());

    const e = await estado(id);
    expect(e).toMatchObject({ status: 'aprovada', decidido_por: COORD_A, email_conta: null });
    expect(e.decidido_em).not.toBeNull();

    const view = await vistoPela(PEDE_1);
    expect(view.rows.length).toBeGreaterThan(0);
    expect(view.rows[0]).not.toHaveProperty('data_nascimento');
    expect(view.rows[0]).not.toHaveProperty('email');
  });

  it('a gestão também aprova', async () => {
    const id = await pendencia(CONTATO, PEDE_2);
    await expect(servico.aprovar(GESTOR_A, 'admin_instituicao', id)).resolves.toEqual({ status: 'aprovada' });
  });

  it('decidir de novo falha como "não encontrado" e nada muda', async () => {
    const id = await pendencia(CONTATO, PEDE_1);
    await servico.aprovar(COORD_A, 'admin_instituicao', id);
    for (const decidir of [servico.aprovar.bind(servico), servico.recusar.bind(servico)]) {
      await expect(decidir(COORD_A, 'admin_instituicao', id)).rejects.toMatchObject({
        response: { error: { code: 'NAO_ENCONTRADO' } },
      });
    }
    expect(await donoDoContato(CONTATO)).toBe(PEDE_1);
    expect(await consentimentos(CONTATO)).toHaveLength(1);
    expect((await estado(id)).status).toBe('aprovada');
  });

  it('solicitação de outra instituição é "não encontrado" e nada muda', async () => {
    const id = await pendencia(CONTATO, PEDE_1);
    await expect(servico.aprovar(GESTOR_B, 'admin_instituicao', id)).rejects.toMatchObject({
      response: { error: { code: 'NAO_ENCONTRADO' } },
    });
    await expect(servico.recusar(GESTOR_B, 'admin_instituicao', id)).rejects.toMatchObject({
      response: { error: { code: 'NAO_ENCONTRADO' } },
    });
    expect((await estado(id)).status).toBe('pendente_aprovacao');
    expect(await donoDoContato(CONTATO)).toBeNull();
  });

  it('id inexistente é "não encontrado"', async () => {
    await expect(
      servico.aprovar(COORD_A, 'admin_instituicao', '99999999-0000-4000-8000-000000000000'),
    ).rejects.toMatchObject({ response: { error: { code: 'NAO_ENCONTRADO' } } });
  });

  it('quem pediu foi suspenso depois: 409, nada é ligado e a pendência continua', async () => {
    const id = await pendencia(CONTATO, PEDE_SUSPENSO);
    await banco.pg.query(`UPDATE usuario SET status = 'suspenso' WHERE id = $1`, [PEDE_SUSPENSO]);
    try {
      await expect(servico.aprovar(COORD_A, 'admin_instituicao', id)).rejects.toMatchObject({
        response: { error: { code: 'SOLICITANTE_INDISPONIVEL' } },
      });
    } finally {
      await banco.pg.query(`UPDATE usuario SET status = 'ativo' WHERE id = $1`, [PEDE_SUSPENSO]);
    }
    expect(await donoDoContato(CONTATO)).toBeNull();
    expect(await consentimentos(CONTATO)).toHaveLength(0);
    expect((await estado(id)).status).toBe('pendente_aprovacao');
  });

  it('contato que já foi ligado a outra conta: 409 e nada muda', async () => {
    const id = await pendencia(CONTATO, PEDE_1);
    await banco.pg.query(`UPDATE responsavel_aluno SET usuario_id = $1 WHERE id = $2`, [PEDE_2, CONTATO]);
    await expect(servico.aprovar(COORD_A, 'admin_instituicao', id)).rejects.toMatchObject({
      response: { error: { code: 'CONTATO_JA_VINCULADO' } },
    });
    expect(await donoDoContato(CONTATO)).toBe(PEDE_2);
    expect(await consentimentos(CONTATO)).toHaveLength(0);
    expect((await estado(id)).status).toBe('pendente_aprovacao');
  });

  it('duas aprovações ao mesmo tempo: só uma vence', async () => {
    const id = await pendencia(CONTATO, PEDE_1);
    const r = await Promise.allSettled([
      servico.aprovar(COORD_A, 'admin_instituicao', id),
      servico.aprovar(GESTOR_A, 'admin_instituicao', id),
    ]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(await consentimentos(CONTATO)).toHaveLength(1);
  });

  it.each([
    ['professor', PROF_A],
    ['aluno', ALUNO_USER],
    ['responsável', PEDE_1],
  ])('%s não aprova nem recusa', async (_n, quem) => {
    const id = await pendencia(CONTATO, PEDE_2);
    await expect(servico.aprovar(quem, 'x', id)).rejects.toMatchObject({
      response: { error: { code: 'FORA_DO_ESCOPO' } },
    });
    await expect(servico.recusar(quem, 'x', id)).rejects.toMatchObject({
      response: { error: { code: 'FORA_DO_ESCOPO' } },
    });
    expect((await estado(id)).status).toBe('pendente_aprovacao');
  });
});

describe('recusar', () => {
  it('não vincula, não grava consentimento, e a conta segue sem ler o aluno', async () => {
    const id = await pendencia(CONTATO, PEDE_RECUSADO);
    await expect(servico.recusar(COORD_A, 'admin_instituicao', id)).resolves.toEqual({ status: 'recusada' });

    expect(await donoDoContato(CONTATO)).toBeNull();
    expect(await consentimentos(CONTATO)).toHaveLength(0);
    const e = await estado(id);
    expect(e).toMatchObject({ status: 'recusada', decidido_por: COORD_A, email_conta: null });
    expect(e.decidido_em).not.toBeNull();
    expect((await vistoPela(PEDE_RECUSADO)).rows).toHaveLength(0);
  });

  it('depois de recusar, a instituição pode emitir um convite novo', async () => {
    const id = await pendencia(CONTATO, PEDE_2);
    await servico.recusar(COORD_A, 'admin_instituicao', id);
    await expect(convites.criarConvite(COORD_A, 'admin_instituicao', CONTATO)).resolves.toBeDefined();
  });
});

describe('auditoria', () => {
  it('aprovar e recusar gravam ator e ids, sem dado pessoal', async () => {
    const a = await pendencia(CONTATO, PEDE_1);
    const outro = await novoContato();
    const r = await pendencia(outro, PEDE_2);
    await servico.aprovar(COORD_A, 'admin_instituicao', a);
    await servico.recusar(GESTOR_A, 'admin_instituicao', r);

    const { rows } = await banco.pg.query<{ acao: string; ator_id: string; papel: string; dados: Record<string, unknown> }>(
      `SELECT acao, ator_id, papel, dados FROM audit_log
        WHERE acao IN ('responsavel.vinculo_aprovado', 'responsavel.vinculo_recusado')
          AND dados->>'solicitacaoId' IN ($1, $2) ORDER BY acao`,
      [a, r],
    );
    expect(rows.map((x) => [x.acao, x.ator_id])).toEqual([
      ['responsavel.vinculo_aprovado', COORD_A],
      ['responsavel.vinculo_recusado', GESTOR_A],
    ]);
    for (const x of rows) {
      expect(x.papel).toBe('admin_instituicao');
      expect(Object.keys(x.dados).sort()).toEqual(['responsavelAlunoId', 'solicitacaoId']);
    }
    expect(await acharPiiNoAuditLog(banco.pg)).toEqual([]);
  });
});
