import { createHash } from 'node:crypto';
import {
  AceitarConviteResponsavelRequestSchema,
  DIAS_VALIDADE_CONVITE_RESPONSAVEL,
  VERSAO_TERMO_RESPONSAVEL,
} from '@notaa/contracts';
import { acharPiiNoAuditLog } from '@notaa/db/src/testing/audit-sem-pii';
import { criarBancoDeTeste, type BancoDeTeste } from '@notaa/db/src/testing/banco-de-teste';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EscopoService } from '../../escopo/escopo.service';
import { ConviteResponsavelService } from '../convite-responsavel.service';

// Convite do responsável contra Postgres de verdade (PGlite, migrações reais):
// token aleatório e só em hash, validade, uso único (inclusive em corrida),
// consentimento gravado, auditoria sem dado pessoal e nenhuma pista de aluno.

const INST_A = '0000000a-0000-4000-8000-000000000000';
const INST_B = '0000000b-0000-4000-8000-000000000000';
const GESTOR_A = '11111111-0000-4000-8000-000000000001';
const COORD_A = '11111111-0000-4000-8000-000000000002';
const PROF_A = '11111111-0000-4000-8000-000000000003';
const RESP_1 = '11111111-0000-4000-8000-000000000004';
const RESP_2 = '11111111-0000-4000-8000-000000000005';
const ALUNO_USER = '11111111-0000-4000-8000-000000000006';
const GESTOR_B = '11111111-0000-4000-8000-000000000007';
// Conta de responsável que NUNCA liga contato nenhum nesta suíte: serve para provar "não lê nada".
const ESTRANHO = '11111111-0000-4000-8000-000000000008';
const RESP_SUSPENSO = '11111111-0000-4000-8000-000000000009';
const ALUNO_CAD = 'ca0000a1-0000-4000-8000-000000000000';
const ALUNO_CAD_B = 'ca00000b-0000-4000-8000-000000000000';
const CONTATO_B = 'aa00000b-0000-4000-8000-000000000000';

let banco: BancoDeTeste;
let servico: ConviteResponsavelService;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const aceite = (token: string) => ({
  token,
  aceitaTermo: true as const,
  versaoTermo: VERSAO_TERMO_RESPONSAVEL as typeof VERSAO_TERMO_RESPONSAVEL,
});

// E-mail cadastrado de cada contato criado aqui. O aceite compara com o e-mail
// da conta (claim do token); `aceitar` manda o do contato, como faria o dono.
const EMAIL_DO_CONTATO = new Map<string, string>();
const aceitar = (quem: string, token: string, contato?: string) =>
  servico.aceitarConvite(quem, EMAIL_DO_CONTATO.get(contato ?? CONTATO), aceite(token));
// Aceite de uma conta com o e-mail que ela quiser (ou nenhum).
const aceitarComo = (quem: string, email: string | undefined, token: string) =>
  servico.aceitarConvite(quem, email, aceite(token));

const ERRO_DE_CONVITE_INVALIDO = async (p: Promise<unknown>) => {
  const erro = await p.catch((e: unknown) => e);
  return JSON.stringify({ status: (erro as { status: number }).status, corpo: (erro as { response: unknown }).response });
};

// O consentimento e a auditoria são só de inserção: não dá para limpar entre
// os testes. Cada teste ganha dois contatos novos, e as consultas filtram por eles.
let CONTATO: string;
let CONTATO_2: string;
let sequencia = 0;

async function novoContato(): Promise<string> {
  const n = ++sequencia;
  const { rows } = await banco.pg.query<{ id: string }>(
    `INSERT INTO responsavel_aluno (instituicao_id, aluno_instituicao_id, nome, email, telefone)
     VALUES ($1, $2, 'Mãe', $3, '11999990000') RETURNING id`,
    [INST_A, ALUNO_CAD, `mae-${n}@a.test`],
  );
  EMAIL_DO_CONTATO.set(rows[0]!.id, `mae-${n}@a.test`);
  return rows[0]!.id;
}

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await banco.pg.exec(`
    INSERT INTO instituicao (id, nome) VALUES ('${INST_A}', 'A'), ('${INST_B}', 'B');
    INSERT INTO usuario (id, auth_uid, tipo_perfil, email, nome, status, instituicao_id, funcao_instituicao) VALUES
      ('${GESTOR_A}', '${GESTOR_A}', 'admin_instituicao', 'g@a.test', 'Gestora', 'ativo', '${INST_A}', 'gestor'),
      ('${COORD_A}', '${COORD_A}', 'admin_instituicao', 'c@a.test', 'Coord', 'ativo', '${INST_A}', 'coordenacao'),
      ('${PROF_A}', '${PROF_A}', 'professor_institucional', 'p@a.test', 'Prof', 'ativo', '${INST_A}', NULL),
      ('${RESP_1}', '${RESP_1}', 'responsavel', 'r1@x.test', 'Responsável 1', 'ativo', NULL, NULL),
      ('${RESP_2}', '${RESP_2}', 'responsavel', 'r2@x.test', 'Responsável 2', 'ativo', NULL, NULL),
      ('${ALUNO_USER}', '${ALUNO_USER}', 'estudante', 'e@x.test', 'Estudante', 'ativo', NULL, NULL),
      ('${GESTOR_B}', '${GESTOR_B}', 'admin_instituicao', 'g@b.test', 'Gestor B', 'ativo', '${INST_B}', 'gestor'),
      ('${ESTRANHO}', '${ESTRANHO}', 'responsavel', 'estranho@y.test', 'Estranho', 'ativo', NULL, NULL),
      ('${RESP_SUSPENSO}', '${RESP_SUSPENSO}', 'responsavel', 'susp@x.test', 'Suspenso', 'suspenso', NULL, NULL);
    INSERT INTO aluno_instituicao (id, instituicao_id, matricula, nome, data_nascimento, email) VALUES
      ('${ALUNO_CAD}', '${INST_A}', 'A-1', 'Aluno A', '2012-05-01', 'aluno@a.test'),
      ('${ALUNO_CAD_B}', '${INST_B}', 'B-1', 'Aluno B', '2012-06-01', NULL);
    INSERT INTO responsavel_aluno (id, instituicao_id, aluno_instituicao_id, nome, email, telefone) VALUES
      ('${CONTATO_B}', '${INST_B}', '${ALUNO_CAD_B}', 'Mãe B', 'mae@b.test', NULL);
  `);
  servico = new ConviteResponsavelService(banco.db, new EscopoService(banco.db));
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

beforeEach(async () => {
  CONTATO = await novoContato();
  CONTATO_2 = await novoContato();
});

describe('emitir o convite', () => {
  it('devolve um token aleatório de 32 bytes e expira em 7 dias', async () => {
    const antes = Date.now();
    const { token, expiraEm } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes em base64url
    const dias = (new Date(expiraEm).getTime() - antes) / 86_400_000;
    expect(DIAS_VALIDADE_CONVITE_RESPONSAVEL).toBe(7);
    expect(dias).toBeGreaterThan(6.99);
    expect(dias).toBeLessThan(7.01);
  });

  it('dois convites não repetem o token', async () => {
    const a = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    const b = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO_2);
    expect(a.token).not.toBe(b.token);
  });

  it('o banco guarda só o SHA-256, em nenhuma coluna o token em claro', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    const { rows } = await banco.pg.query<{ token_hash: string }>(
      'SELECT * FROM convite_responsavel WHERE responsavel_aluno_id = $1',
      [CONTATO],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.token_hash).toBe(sha256(token));
    expect(JSON.stringify(rows)).not.toContain(token);
    const log = await banco.pg.query('SELECT dados FROM audit_log WHERE dados->>\'responsavelAlunoId\' = $1', [CONTATO]);
    expect(JSON.stringify(log.rows)).not.toContain(token);
  });

  it('a coordenação emite; professor, aluno e responsável não', async () => {
    await expect(servico.criarConvite(COORD_A, 'admin_instituicao', CONTATO)).resolves.toBeDefined();
    for (const quem of [PROF_A, ALUNO_USER, RESP_1]) {
      await expect(servico.criarConvite(quem, 'x', CONTATO_2)).rejects.toMatchObject({
        response: { error: { code: 'FORA_DO_ESCOPO' } },
      });
    }
  });

  it('contato de outra instituição é "não encontrado" e nada é criado', async () => {
    await expect(servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO_B)).rejects.toMatchObject({
      response: { error: { code: 'NAO_ENCONTRADO' } },
    });
    await expect(servico.criarConvite(GESTOR_B, 'admin_instituicao', CONTATO)).rejects.toMatchObject({
      response: { error: { code: 'NAO_ENCONTRADO' } },
    });
    const { rows } = await banco.pg.query('SELECT 1 FROM convite_responsavel WHERE responsavel_aluno_id = $1', [CONTATO_B]);
    expect(rows).toHaveLength(0);
    const { rows: deA } = await banco.pg.query('SELECT 1 FROM convite_responsavel WHERE instituicao_id = $1 AND responsavel_aluno_id = $2', [INST_B, CONTATO]);
    expect(deA).toHaveLength(0);
  });

  it('um convite novo revoga o anterior ainda pendente do mesmo contato', async () => {
    const velho = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    const novo = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    await expect(aceitar(RESP_1, velho.token)).rejects.toMatchObject({
      response: { error: { code: 'CONVITE_INVALIDO' } },
    });
    await expect(aceitar(RESP_1, novo.token)).resolves.toEqual({ aceito: true });
  });

  it('não emite para contato que já está ligado a uma conta', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    await aceitar(RESP_1, token);
    await expect(servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO)).rejects.toMatchObject({
      response: { error: { code: 'CONTATO_JA_VINCULADO' } },
    });
  });

  it('audita a emissão só com ids', async () => {
    await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    const { rows } = await banco.pg.query<{ acao: string; entidade: string; dados: Record<string, unknown> }>(
      `SELECT acao, entidade, dados FROM audit_log WHERE acao = 'convite_responsavel.criado' AND dados->>'responsavelAlunoId' = $1`,
      [CONTATO],
    );
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]!.dados).sort()).toEqual(['expiraEm', 'responsavelAlunoId']);
    expect(JSON.stringify(rows)).not.toMatch(/mae-\d+@a\.test|11999990000|Mãe/);
  });
});

describe('aceitar o convite', () => {
  it('liga a conta, grava o consentimento, consome o convite e audita, tudo junto', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);

    // Antes do aceite, o responsável não vê o aluno.
    // (RESP_1 pode já ter aceitado outros contatos nos testes anteriores: a view devolve o
    // mesmo aluno. Por isso a prova de "antes" é feita com RESP_2, que nunca aceita nada aqui.)
    const antes = await banco.comoUsuario(RESP_2, (q) => q('SELECT * FROM aluno_do_responsavel'));
    expect(antes.rows).toHaveLength(0);

    const resposta = await aceitar(RESP_1, token);
    expect(resposta).toEqual({ aceito: true });

    const { rows: contato } = await banco.pg.query<{ usuario_id: string }>(
      'SELECT usuario_id FROM responsavel_aluno WHERE id = $1',
      [CONTATO],
    );
    expect(contato[0]!.usuario_id).toBe(RESP_1);

    const { rows: consent } = await banco.pg.query<Record<string, unknown>>(
      'SELECT * FROM consentimento_responsavel WHERE responsavel_aluno_id = $1',
      [CONTATO],
    );
    expect(consent).toHaveLength(1);
    expect(consent[0]).toMatchObject({
      instituicao_id: INST_A,
      responsavel_aluno_id: CONTATO,
      usuario_id: RESP_1,
      versao_termo: VERSAO_TERMO_RESPONSAVEL,
    });
    expect(consent[0]!.aceito_em).toBeTruthy();

    const { rows: convite } = await banco.pg.query<{ usado_em: Date | null; usado_por: string }>(
      'SELECT usado_em, usado_por FROM convite_responsavel WHERE responsavel_aluno_id = $1',
      [CONTATO],
    );
    expect(convite[0]!.usado_em).not.toBeNull();
    expect(convite[0]!.usado_por).toBe(RESP_1);

    // E agora a RLS deixa ler, pela view, sem data de nascimento nem e-mail.
    const depois = await banco.comoUsuario(RESP_1, (q) => q<Record<string, unknown>>('SELECT * FROM aluno_do_responsavel'));
    expect(depois.rows).toHaveLength(1);
    expect(depois.rows[0]).not.toHaveProperty('data_nascimento');
    expect(depois.rows[0]).not.toHaveProperty('email');
  });

  it('a auditoria do aceite tem só ids e a versão do termo', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    await aceitar(RESP_1, token);
    const { rows } = await banco.pg.query<{ ator_id: string; papel: string; dados: Record<string, unknown> }>(
      `SELECT ator_id, papel, dados FROM audit_log WHERE acao = 'responsavel.aceitou_convite' AND dados->>'responsavelAlunoId' = $1`,
      [CONTATO],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ator_id: RESP_1, papel: 'responsavel' });
    expect(Object.keys(rows[0]!.dados).sort()).toEqual(['conviteId', 'responsavelAlunoId', 'versaoTermo']);
    expect(JSON.stringify(rows)).not.toMatch(/@|Mãe|Aluno A|11999990000/);
  });

  it('uso único: o segundo aceite falha, da mesma conta ou de outra', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    await aceitar(RESP_1, token);
    for (const quem of [RESP_1, RESP_2]) {
      await expect(aceitar(quem, token)).rejects.toMatchObject({
        response: { error: { code: 'CONVITE_INVALIDO' } },
      });
    }
    const { rows } = await banco.pg.query<{ usuario_id: string }>(
      'SELECT usuario_id FROM responsavel_aluno WHERE id = $1',
      [CONTATO],
    );
    expect(rows[0]!.usuario_id).toBe(RESP_1);
    expect(
      (await banco.pg.query('SELECT 1 FROM consentimento_responsavel WHERE responsavel_aluno_id = $1', [CONTATO])).rows,
    ).toHaveLength(1);
  });

  it('corrida: dois aceites ao mesmo tempo, só um vence', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    const resultados = await Promise.allSettled([
      aceitar(RESP_1, token),
      aceitar(RESP_2, token),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(
      (await banco.pg.query('SELECT 1 FROM consentimento_responsavel WHERE responsavel_aluno_id = $1', [CONTATO])).rows,
    ).toHaveLength(1);
  });

  it('convite expirado não vale', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    await banco.pg.query(
      `UPDATE convite_responsavel SET criado_em = now() - interval '8 days', expira_em = now() - interval '1 day'
        WHERE responsavel_aluno_id = $1`,
      [CONTATO],
    );
    await expect(aceitar(RESP_1, token)).rejects.toMatchObject({
      response: { error: { code: 'CONVITE_INVALIDO' } },
    });
    expect(
      (await banco.pg.query('SELECT 1 FROM consentimento_responsavel WHERE responsavel_aluno_id = $1', [CONTATO])).rows,
    ).toHaveLength(0);
  });

  it('convite revogado não vale', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    await banco.pg.query(`UPDATE convite_responsavel SET revogado_em = now() WHERE responsavel_aluno_id = $1`, [CONTATO]);
    await expect(aceitar(RESP_1, token)).rejects.toMatchObject({
      response: { error: { code: 'CONVITE_INVALIDO' } },
    });
  });

  it('só quem é responsável aceita; o convite continua valendo para o responsável de verdade', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    for (const quem of [ALUNO_USER, PROF_A, GESTOR_A, GESTOR_B]) {
      await expect(aceitar(quem, token)).rejects.toMatchObject({
        response: { error: { code: 'FORA_DO_ESCOPO' } },
      });
    }
    const { rows } = await banco.pg.query<{ usado_em: Date | null }>(
      'SELECT usado_em FROM convite_responsavel WHERE responsavel_aluno_id = $1',
      [CONTATO],
    );
    expect(rows[0]!.usado_em).toBeNull();
    await expect(aceitar(RESP_1, token)).resolves.toEqual({ aceito: true });
  });

  it('é tudo ou nada: se o consentimento não grava, o convite não é consumido nem a conta ligada', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    // Consentimento da mesma versão já existe para este contato (por outra conta).
    await banco.pg.query(
      `INSERT INTO consentimento_responsavel (instituicao_id, responsavel_aluno_id, usuario_id, versao_termo)
       VALUES ($1, $2, $3, $4)`,
      [INST_A, CONTATO, RESP_2, VERSAO_TERMO_RESPONSAVEL],
    );
    await expect(aceitar(RESP_1, token)).rejects.toMatchObject({
      response: { error: { code: 'CONVITE_INVALIDO' } },
    });
    const { rows: convite } = await banco.pg.query<{ usado_em: Date | null }>(
      'SELECT usado_em FROM convite_responsavel WHERE responsavel_aluno_id = $1',
      [CONTATO],
    );
    expect(convite[0]!.usado_em).toBeNull();
    const { rows: contato } = await banco.pg.query<{ usuario_id: string | null }>(
      'SELECT usuario_id FROM responsavel_aluno WHERE id = $1',
      [CONTATO],
    );
    expect(contato[0]!.usuario_id).toBeNull();
  });
});

describe('o e-mail da conta tem que ser o do contato', () => {
  const vistoPela = (uid: string) =>
    banco.comoUsuario(uid, (q) => q<Record<string, unknown>>('SELECT * FROM aluno_do_responsavel'));
  const solicitacoes = async (contato: string) =>
    (
      await banco.pg.query<{
        status: string;
        usuario_id: string;
        email_conta: string | null;
        versao_termo: string;
        convite_id: string;
      }>('SELECT * FROM solicitacao_vinculo_responsavel WHERE responsavel_aluno_id = $1', [contato])
    ).rows;
  const contatoVinculado = async (contato: string) =>
    (await banco.pg.query<{ usuario_id: string | null }>('SELECT usuario_id FROM responsavel_aluno WHERE id = $1', [contato]))
      .rows[0]!.usuario_id;
  const consentimentos = async (contato: string) =>
    (await banco.pg.query('SELECT 1 FROM consentimento_responsavel WHERE responsavel_aluno_id = $1', [contato])).rows;
  const conviteUsado = async (contato: string) =>
    (await banco.pg.query<{ usado_em: Date | null }>('SELECT usado_em FROM convite_responsavel WHERE responsavel_aluno_id = $1', [contato]))
      .rows[0]!.usado_em;

  it('e-mail igual vincula, grava o consentimento e abre a view', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    await expect(aceitar(RESP_1, token)).resolves.toEqual({ aceito: true });
    expect(await contatoVinculado(CONTATO)).toBe(RESP_1);
    expect(await consentimentos(CONTATO)).toHaveLength(1);
    expect(await solicitacoes(CONTATO)).toHaveLength(0);
    expect((await vistoPela(RESP_1)).rows.length).toBeGreaterThan(0);
  });

  it('a comparação ignora caixa e espaços nas pontas', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    const cadastrado = EMAIL_DO_CONTATO.get(CONTATO)!;
    await expect(aceitarComo(RESP_1, `  ${cadastrado.toUpperCase()} `, token)).resolves.toEqual({ aceito: true });
    expect(await contatoVinculado(CONTATO)).toBe(RESP_1);
  });

  // "ã" pode vir como um caractere (NFC) ou como "a" + til combinante (NFD). O
  // mesmo e-mail digitado de um jeito ou de outro não pode virar pendência.
  it('acento em NFD (a + til combinante) vincula ao e-mail cadastrado em NFC', async () => {
    const NFC = 'João.pai@a.test';
    const NFD = 'João.PAI@A.TEST';
    const { rows } = await banco.pg.query<{ id: string }>(
      `INSERT INTO responsavel_aluno (instituicao_id, aluno_instituicao_id, nome, email, telefone)
       VALUES ($1, $2, 'Pai', $3, '11999990000') RETURNING id`,
      [INST_A, ALUNO_CAD, NFC],
    );
    const contato = rows[0]!.id;
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', contato);

    await expect(aceitarComo(RESP_2, NFD, token)).resolves.toEqual({ aceito: true });
    expect(await contatoVinculado(contato)).toBe(RESP_2);
    expect(await solicitacoes(contato)).toHaveLength(0);
  });

  it('acento diferente não vincula: "josé" não é "jose", e a resposta segue sendo convite inválido', async () => {
    const { rows } = await banco.pg.query<{ id: string }>(
      `INSERT INTO responsavel_aluno (instituicao_id, aluno_instituicao_id, nome, email, telefone)
       VALUES ($1, $2, 'Mãe', 'jose.acento@a.test', '11999990000') RETURNING id`,
      [INST_A, ALUNO_CAD],
    );
    const contato = rows[0]!.id;
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', contato);

    await expect(aceitarComo(ESTRANHO, 'José.acento@a.test', token)).rejects.toMatchObject({
      response: { error: { code: 'CONVITE_INVALIDO' } },
    });
    expect(await contatoVinculado(contato)).toBeNull();
    expect((await solicitacoes(contato))[0]).toMatchObject({ status: 'pendente_aprovacao' });
  });

  it('e-mail diferente não vincula: fica pendente, sem consentimento, e a view segue vazia', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    await expect(aceitarComo(ESTRANHO, 'Estranho@Y.test ', token)).rejects.toMatchObject({
      response: { error: { code: 'CONVITE_INVALIDO' } },
    });

    expect(await contatoVinculado(CONTATO)).toBeNull();
    expect(await consentimentos(CONTATO)).toHaveLength(0);
    // A tentativa fica registrada, e o token é consumido (uso único).
    const [pendente, ...resto] = await solicitacoes(CONTATO);
    expect(resto).toHaveLength(0);
    expect(pendente).toMatchObject({
      status: 'pendente_aprovacao',
      usuario_id: ESTRANHO,
      email_conta: 'estranho@y.test',
      versao_termo: VERSAO_TERMO_RESPONSAVEL,
    });
    expect(await conviteUsado(CONTATO)).not.toBeNull();

    expect((await vistoPela(ESTRANHO)).rows).toHaveLength(0);
    const direto = await banco.comoUsuario(ESTRANHO, (q) => q('SELECT * FROM aluno_instituicao'));
    expect(direto.rows).toHaveLength(0);
  });

  it('sem e-mail no token, a tentativa também fica pendente', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    await expect(aceitarComo(ESTRANHO, undefined, token)).rejects.toMatchObject({
      response: { error: { code: 'CONVITE_INVALIDO' } },
    });
    expect(await contatoVinculado(CONTATO)).toBeNull();
    expect((await solicitacoes(CONTATO))[0]).toMatchObject({ status: 'pendente_aprovacao', email_conta: null });
  });

  it('a resposta da divergência é igual à de token inexistente: mesmo status e mesmo corpo', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    const divergente = await ERRO_DE_CONVITE_INVALIDO(aceitarComo(ESTRANHO, 'estranho@y.test', token));
    const inexistente = await ERRO_DE_CONVITE_INVALIDO(aceitarComo(ESTRANHO, 'estranho@y.test', 'x'.repeat(43)));
    expect(divergente).toBe(inexistente);
    expect(divergente).toContain('CONVITE_INVALIDO');
    expect(divergente).not.toMatch(/pendente|aprova|e-?mail|Aluno|Mãe/i);
  });

  it('token repassado a outra conta não lê nada, e quem era o dono depois só recebe "convite inválido"', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);

    await expect(aceitarComo(ESTRANHO, 'estranho@y.test', token)).rejects.toMatchObject({
      response: { error: { code: 'CONVITE_INVALIDO' } },
    });
    expect((await vistoPela(ESTRANHO)).rows).toHaveLength(0);
    expect(
      (await banco.comoUsuario(ESTRANHO, (q) => q('SELECT * FROM responsavel_aluno'))).rows,
    ).toHaveLength(0);
    expect(
      (await banco.comoUsuario(ESTRANHO, (q) => q('SELECT * FROM solicitacao_vinculo_responsavel'))).rows,
    ).toHaveLength(0);

    await expect(aceitar(RESP_1, token)).rejects.toMatchObject({
      response: { error: { code: 'CONVITE_INVALIDO' } },
    });
    expect(await contatoVinculado(CONTATO)).toBeNull();
  });

  it('com a pendência aberta, um convite novo e o e-mail certo vinculam e fecham a pendência', async () => {
    const velho = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    await aceitarComo(ESTRANHO, 'estranho@y.test', velho.token).catch(() => undefined);
    const novo = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);

    await expect(aceitar(RESP_1, novo.token)).resolves.toEqual({ aceito: true });
    expect(await contatoVinculado(CONTATO)).toBe(RESP_1);
    expect((await solicitacoes(CONTATO)).map((s) => s.status)).toEqual(['cancelada']);
    expect((await solicitacoes(CONTATO))[0]!.email_conta).toBeNull();
  });

  it('segunda pendência para o mesmo contato falha como convite inválido e não consome o token', async () => {
    const primeiro = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    await aceitarComo(ESTRANHO, 'estranho@y.test', primeiro.token).catch(() => undefined);
    const segundo = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);

    await expect(aceitarComo(RESP_2, 'r2@x.test', segundo.token)).rejects.toMatchObject({
      response: { error: { code: 'CONVITE_INVALIDO' } },
    });
    expect(await solicitacoes(CONTATO)).toHaveLength(1);
    const { rows } = await banco.pg.query<{ usado_em: Date | null }>(
      'SELECT usado_em FROM convite_responsavel WHERE token_hash = $1',
      [sha256(segundo.token)],
    );
    expect(rows[0]!.usado_em).toBeNull();
  });

  it('quem não é responsável ativo não cria nem pendência, e o token segue valendo', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    for (const quem of [ALUNO_USER, PROF_A, GESTOR_B, RESP_SUSPENSO]) {
      await expect(aceitarComo(quem, 'qualquer@y.test', token)).rejects.toMatchObject({
        response: { error: { code: 'FORA_DO_ESCOPO' } },
      });
    }
    expect(await solicitacoes(CONTATO)).toHaveLength(0);
    expect(await conviteUsado(CONTATO)).toBeNull();
  });

  it('a auditoria da pendência tem só ids', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    await aceitarComo(ESTRANHO, 'estranho@y.test', token).catch(() => undefined);
    const { rows } = await banco.pg.query<{ ator_id: string; papel: string; entidade: string; dados: Record<string, unknown> }>(
      `SELECT ator_id, papel, entidade, dados FROM audit_log
        WHERE acao = 'responsavel.vinculo_pendente' AND dados->>'responsavelAlunoId' = $1`,
      [CONTATO],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ator_id: ESTRANHO, papel: 'responsavel' });
    expect(Object.keys(rows[0]!.dados).sort()).toEqual(['conviteId', 'responsavelAlunoId', 'solicitacaoId']);
    expect(JSON.stringify(rows)).not.toMatch(/@|estranho|Mãe|Aluno A|11999990000/i);
  });
});

describe('sem pistas sobre alunos', () => {
  it('token inexistente, usado, expirado e revogado dão exatamente a mesma resposta', async () => {
    const usado = (await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO)).token;
    await aceitar(RESP_1, usado);
    const expirado = (await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO_2)).token;
    await banco.pg.query(
      `UPDATE convite_responsavel SET criado_em = now() - interval '8 days', expira_em = now() - interval '1 day'
        WHERE responsavel_aluno_id = $1`,
      [CONTATO_2],
    );
    const contato3 = await novoContato();
    const revogado = (await servico.criarConvite(GESTOR_A, 'admin_instituicao', contato3)).token;
    await banco.pg.query(`UPDATE convite_responsavel SET revogado_em = now() WHERE responsavel_aluno_id = $1`, [contato3]);

    const respostas: string[] = [];
    for (const token of ['x'.repeat(43), usado, expirado, revogado]) {
      const erro = await aceitar(RESP_2, token).catch((e: unknown) => e);
      respostas.push(JSON.stringify({ status: (erro as { status: number }).status, corpo: (erro as { response: unknown }).response }));
    }
    expect(new Set(respostas).size).toBe(1);
    expect(respostas[0]).toContain('CONVITE_INVALIDO');
    expect(respostas[0]).not.toMatch(/Aluno|Mãe|Pai|A-1|aluno/i);
  });

  it('a resposta de sucesso não traz nenhum dado do aluno nem da instituição', async () => {
    const { token } = await servico.criarConvite(GESTOR_A, 'admin_instituicao', CONTATO);
    const resposta = await aceitar(RESP_1, token);
    expect(Object.keys(resposta)).toEqual(['aceito']);
  });
});

describe('o corpo do aceite', () => {
  const valido = { token: 'a'.repeat(43), aceitaTermo: true, versaoTermo: VERSAO_TERMO_RESPONSAVEL };

  it('exige o aceite explícito do termo', () => {
    expect(AceitarConviteResponsavelRequestSchema.safeParse({ ...valido, aceitaTermo: false }).success).toBe(false);
    expect(AceitarConviteResponsavelRequestSchema.safeParse({ token: valido.token, versaoTermo: valido.versaoTermo }).success).toBe(false);
  });

  it('exige a versão vigente do termo', () => {
    expect(AceitarConviteResponsavelRequestSchema.safeParse({ ...valido, versaoTermo: '1999-01-v0' }).success).toBe(false);
  });

  it('descarta instituicaoId, alunoId e usuarioId que vierem no corpo', () => {
    const r = AceitarConviteResponsavelRequestSchema.parse({
      ...valido, instituicaoId: INST_B, alunoId: ALUNO_CAD_B, usuarioId: RESP_2,
    });
    expect(Object.keys(r).sort()).toEqual(['aceitaTermo', 'token', 'versaoTermo']);
  });

  it('recusa token curto demais', () => {
    expect(AceitarConviteResponsavelRequestSchema.safeParse({ ...valido, token: 'curto' }).success).toBe(false);
  });
});

describe('privacidade da auditoria', () => {
  it('emissão e aceite do convite não gravam dado pessoal nem o token', async () => {
    const { rows } = await banco.pg.query(`SELECT 1 FROM audit_log WHERE acao LIKE 'convite_responsavel.%' OR acao LIKE 'responsavel.%'`);
    expect(rows.length).toBeGreaterThan(0);
    expect(await acharPiiNoAuditLog(banco.pg)).toEqual([]);
  });
});
