import { ImportacaoRepositoryDb, eq, importacao, type Database } from '@notaa/db';
import { criarBancoDeTeste, type BancoDeTeste } from '@notaa/db/src/testing/banco-de-teste';
import {
  cabecalhoDoModelo,
  detectarFormato,
  gerarXlsx,
  lerPlanilha,
  sugerirMapeamento,
} from '@notaa/importacao';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  pegarProxima,
  processarImportacao,
  recuperarTravadas,
  type ArquivosDoWorker,
} from '../processar-importacao';

// Critério de aceite da Fase 1: uma planilha de 300 alunos com 20 linhas
// inválidas gera a prévia certa; confirmar cria 280; reimportar cria 0.
// Banco: PGlite em memória com as migrações reais (nada de produção).

const INST = '0000000a-0000-4000-8000-000000000000';
const OUTRA_INST = '0000000b-0000-4000-8000-000000000000';
const GESTOR = '11111111-0000-4000-8000-000000000001';
const CONTA_RESPONSAVEL = '11111111-0000-4000-8000-000000000002';
const ANO = '00000a00-0000-4000-8000-000000000000';

let banco: BancoDeTeste;
let db: Database;
const armazenadas = new Map<string, Uint8Array>();
const arquivos: ArquivosDoWorker = {
  baixar: async (path) => armazenadas.get(path) ?? null,
  remover: async (path) => {
    armazenadas.delete(path);
  },
};

async function contar(tabela: string, instituicaoId = INST): Promise<number> {
  const { rows } = await banco.pg.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM ${tabela} WHERE instituicao_id = $1`,
    [instituicaoId],
  );
  return rows[0]!.n;
}

/** 300 linhas no formato do modelo; 20 inválidas, de quatro tipos. */
function linhasDaPlanilha(): (string | null)[][] {
  const turmas = ['1º ano A', '1º ano B', '1º ano C'];
  const linhas = Array.from({ length: 300 }, (_, i) => {
    const n = i + 1;
    return [
      `2026${String(n).padStart(4, '0')}`,
      `Aluno ${n}`,
      '05/03/2010',
      null,
      turmas[i % 3]!,
      `Responsável ${n}`,
      `resp${n}@exemplo.test`,
      '(11) 99999-0000',
      'mãe',
      null,
      null,
      null,
      null,
    ];
  });
  for (let n = 1; n <= 5; n++) linhas[n - 1]![0] = ''; // sem matrícula
  for (let n = 6; n <= 10; n++) linhas[n - 1]![6] = 'nao-e-email'; // e-mail de responsável inválido
  for (let n = 11; n <= 14; n++) linhas[n - 1]![4] = '9º ano Z'; // turma inexistente
  for (const n of [16, 18, 20]) linhas[n - 1]![0] = linhas[n - 2]![0]!; // três pares repetidos
  return linhas;
}

let xlsx: Uint8Array;

async function novaImportacao(path: string, bytes: Uint8Array = xlsx): Promise<string> {
  armazenadas.set(path, bytes);
  const planilha = await lerPlanilha(bytes, detectarFormato(bytes, 'alunos.xlsx'));
  const [criada] = await db
    .insert(importacao)
    .values({
      instituicaoId: INST,
      tipo: 'alunos',
      status: 'em_previa',
      nomeArquivo: 'alunos.xlsx',
      arquivoPath: path,
      formato: 'xlsx',
      cabecalhos: planilha.cabecalhos,
      mapeamento: sugerirMapeamento('alunos', planilha.cabecalhos),
      criadoPor: GESTOR,
    })
    .returning({ id: importacao.id });
  return criada!.id;
}

async function previa(id: string) {
  const [linha] = await db.select().from(importacao).where(eqId(id));
  const planilha = await lerPlanilha(armazenadas.get(linha!.arquivoPath)!, 'xlsx');
  return new ImportacaoRepositoryDb(db).planejar(
    INST,
    'alunos',
    planilha,
    linha!.mapeamento as Record<string, number | null>,
  );
}

async function confirmarEProcessar(id: string) {
  await banco.pg.query(
    `UPDATE importacao SET status = 'pendente', confirmado_em = now() WHERE id = $1`,
    [id],
  );
  expect(await pegarProxima(db)).toBe(id);
  await processarImportacao({ db, arquivos }, id);
  const [linha] = await db.select().from(importacao).where(eqId(id));
  return linha!;
}

const eqId = (id: string) => eq(importacao.id, id);

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  db = banco.db;
  await banco.pg.exec(`
    INSERT INTO instituicao (id, nome) VALUES ('${INST}', 'Instituição A'), ('${OUTRA_INST}', 'Instituição B');
    INSERT INTO usuario (id, auth_uid, tipo_perfil, email, status, instituicao_id, funcao_instituicao) VALUES
      ('${GESTOR}', '${GESTOR}', 'admin_instituicao', 'gestor@a.test', 'ativo', '${INST}', 'gestor'),
      ('${CONTA_RESPONSAVEL}', '${CONTA_RESPONSAVEL}', 'responsavel', 'resp100@exemplo.test', 'ativo', NULL, NULL);
    INSERT INTO ano_letivo (id, rotulo) VALUES ('${ANO}', '2026');
    INSERT INTO ano_letivo_periodo (ano_letivo_id, instituicao_id) VALUES ('${ANO}', '${INST}');
    INSERT INTO turma (instituicao_id, ano_letivo_id, nome) VALUES
      ('${INST}', '${ANO}', '1º ano A'), ('${INST}', '${ANO}', '1º ano B'), ('${INST}', '${ANO}', '1º ano C'),
      ('${OUTRA_INST}', '${ANO}', '9º ano Z');
  `);
  xlsx = await gerarXlsx(cabecalhoDoModelo('alunos'), linhasDaPlanilha());
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

describe('aceite: importação de 300 alunos', () => {
  let primeira: string;

  it('a prévia mostra 280 a criar e 20 recusadas, com motivo por linha', async () => {
    primeira = await novaImportacao(`${INST}/primeira.xlsx`);
    const { plano } = await previa(primeira);
    expect(plano.resumo).toEqual({ criar: 280, atualizar: 0, sem_alteracao: 0, recusar: 20 });

    const recusas = plano.itens.filter((i) => i.previa.acao === 'recusar').map((i) => i.previa);
    const motivo = (linhaDaPlanilha: number) =>
      recusas.find((r) => r.linha === linhaDaPlanilha)?.motivos[0];
    // Linha da planilha = linha de dados + 1 (cabeçalho).
    expect(motivo(2)).toBe('Matrícula em branco.');
    expect(motivo(7)).toBe('E-mail do responsável 1 inválido: "nao-e-email".');
    // Turma de OUTRA instituição com o mesmo nome não serve.
    expect(motivo(12)).toBe('Turma "9º ano Z" não existe ou está arquivada.');
    expect(motivo(16)).toBe('Matrícula repetida no arquivo (também na linha 17).');
    expect(motivo(17)).toBe('Matrícula repetida no arquivo (também na linha 16).');
  });

  it('a prévia não grava nada', async () => {
    expect(await contar('aluno_instituicao')).toBe(0);
  });

  it('confirmar cria 280 alunos e seus responsáveis', async () => {
    const final = await confirmarEProcessar(primeira);
    expect(final.status).toBe('concluida');
    expect(final.relatorio).toMatchObject({
      criados: 280,
      atualizados: 0,
      semAlteracao: 0,
      recusados: 20,
      responsaveisVinculados: 280,
    });
    expect(final.linhasProcessadas).toBe(300);
    expect(await contar('aluno_instituicao')).toBe(280);
    expect(await contar('responsavel_aluno')).toBe(280);
    expect(await contar('aluno_instituicao', OUTRA_INST)).toBe(0);
  });

  it('casa o responsável com a conta existente pelo e-mail', async () => {
    const { rows } = await banco.pg.query<{ usuario_id: string | null }>(
      `SELECT usuario_id FROM responsavel_aluno WHERE email = 'resp100@exemplo.test'`,
    );
    expect(rows).toEqual([{ usuario_id: CONTA_RESPONSAVEL }]);
  });

  it('audita a importação e cada vínculo de responsável', async () => {
    const { rows } = await banco.pg.query<{ acao: string; n: number }>(
      `SELECT acao, count(*)::int AS n FROM audit_log WHERE instituicao_id = $1 GROUP BY acao ORDER BY acao`,
      [INST],
    );
    expect(rows).toEqual([
      { acao: 'importacao.concluida', n: 1 },
      { acao: 'responsavel.vinculado', n: 280 },
    ]);
  });

  it('apaga a planilha do armazenamento depois de gravar', () => {
    expect(armazenadas.has(`${INST}/primeira.xlsx`)).toBe(false);
  });

  it('reimportar a mesma planilha cria 0', async () => {
    const segunda = await novaImportacao(`${INST}/segunda.xlsx`);
    const { plano } = await previa(segunda);
    expect(plano.resumo).toEqual({ criar: 0, atualizar: 0, sem_alteracao: 280, recusar: 20 });

    const final = await confirmarEProcessar(segunda);
    expect(final.relatorio).toMatchObject({ criados: 0, atualizados: 0, semAlteracao: 280, recusados: 20 });
    expect(await contar('aluno_instituicao')).toBe(280);
    expect(await contar('responsavel_aluno')).toBe(280);
  });
});

describe('fila', () => {
  it('não devolve nada quando não há importação pendente', async () => {
    expect(await pegarProxima(db)).toBeNull();
  });

  it('devolve à fila a importação travada e desiste depois do limite de tentativas', async () => {
    const id = await novaImportacao(`${INST}/travada.xlsx`);
    const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await banco.pg.query(
      `UPDATE importacao SET status = 'processando', iniciado_em = $2, tentativas = 1 WHERE id = $1`,
      [id, umaHoraAtras],
    );
    await recuperarTravadas(db);
    let [linha] = await db.select().from(importacao).where(eqId(id));
    expect(linha!.status).toBe('pendente');

    await banco.pg.query(
      `UPDATE importacao SET status = 'processando', iniciado_em = $2, tentativas = 3 WHERE id = $1`,
      [id, umaHoraAtras],
    );
    await recuperarTravadas(db);
    [linha] = await db.select().from(importacao).where(eqId(id));
    expect(linha!.status).toBe('falhou');
  });

  it('marca como falha, com mensagem para a tela, quando a planilha sumiu', async () => {
    const id = await novaImportacao(`${INST}/sumiu.xlsx`);
    armazenadas.delete(`${INST}/sumiu.xlsx`);
    const final = await confirmarEProcessar(id);
    expect(final.status).toBe('falhou');
    expect(final.erro).toBe('A planilha não está mais disponível. Envie de novo.');
  });
});

describe('mesma matrícula em duas instituições', () => {
  const MATRICULA_COMUM = '20260100'; // já existe na A, importada acima
  const SO_DA_B = 'B-0001';

  beforeAll(async () => {
    await banco.pg.exec(`
      INSERT INTO aluno_instituicao (instituicao_id, matricula, nome, email) VALUES
        ('${OUTRA_INST}', '${MATRICULA_COMUM}', 'Aluno da B', 'aluno@b.test'),
        ('${OUTRA_INST}', '${SO_DA_B}', 'Só da B', NULL);
    `);
  });

  const daB = async () =>
    (
      await banco.pg.query(
        `SELECT matricula, nome, email, turma_id, atualizado_em FROM aluno_instituicao
          WHERE instituicao_id = $1 ORDER BY matricula`,
        [OUTRA_INST],
      )
    ).rows;

  it('importar na A atualiza só a linha da A e deixa a da B como estava', async () => {
    const antes = await daB();
    const planilha = await gerarXlsx(cabecalhoDoModelo('alunos'), [
      [MATRICULA_COMUM, 'Nome corrigido na A', '05/03/2010', null, '1º ano A', null, null, null, null, null, null, null, null],
      [SO_DA_B, 'Aluna nova na A', '05/03/2010', null, '1º ano B', null, null, null, null, null, null, null, null],
    ]);
    const id = await novaImportacao(`${INST}/comum.xlsx`, planilha);
    const { plano } = await previa(id);
    expect(plano.resumo).toMatchObject({ atualizar: 1, criar: 1, recusar: 0 });

    const final = await confirmarEProcessar(id);
    expect(final.status).toBe('concluida');

    const naA = await banco.pg.query<{ matricula: string; nome: string }>(
      `SELECT matricula, nome FROM aluno_instituicao WHERE instituicao_id = $1 AND matricula = ANY($2)`,
      [INST, [MATRICULA_COMUM, SO_DA_B]],
    );
    expect(Object.fromEntries(naA.rows.map((r) => [r.matricula, r.nome]))).toEqual({
      [MATRICULA_COMUM]: 'Nome corrigido na A',
      [SO_DA_B]: 'Aluna nova na A',
    });
    expect(await daB()).toEqual(antes);
  });
});
