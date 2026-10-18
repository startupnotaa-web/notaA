import { acharPiiNoAuditLog } from '@notaa/db/src/testing/audit-sem-pii';
import { criarBancoDeTeste, type BancoDeTeste } from '@notaa/db/src/testing/banco-de-teste';
import { gerarXlsx } from '@notaa/importacao';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EscopoService } from '../../escopo/escopo.service';
import { ArquivoGrandeDemaisError, type ArmazenamentoPlanilhas } from '../armazenamento';
import { ImportacaoService } from '../importacao.service';

// Fluxo interativo da importação (o que a tela faz), contra PGlite e um
// armazenamento em memória. A gravação em si é do worker e tem o teste de
// aceite em apps/worker.

const INST_A = '0000000a-0000-4000-8000-000000000000';
const INST_B = '0000000b-0000-4000-8000-000000000000';
const GESTOR_A = '11111111-0000-4000-8000-000000000001';
const COORD_A = '11111111-0000-4000-8000-000000000002';
const GESTOR_B = '11111111-0000-4000-8000-000000000003';

const arquivos = new Map<string, Uint8Array>();
const armazenamento: ArmazenamentoPlanilhas = {
  urlDeUpload: async (path) => ({ path, token: 'token-de-teste' }),
  baixar: async (path) => arquivos.get(path) ?? null,
};

let banco: BancoDeTeste;
let servico: ImportacaoService;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await banco.pg.exec(`
    INSERT INTO instituicao (id, nome) VALUES ('${INST_A}', 'A'), ('${INST_B}', 'B');
    INSERT INTO usuario (id, auth_uid, tipo_perfil, email, status, instituicao_id, funcao_instituicao) VALUES
      ('${GESTOR_A}', '${GESTOR_A}', 'admin_instituicao', 'g@a.test', 'ativo', '${INST_A}', 'gestor'),
      ('${COORD_A}', '${COORD_A}', 'admin_instituicao', 'c@a.test', 'ativo', '${INST_A}', 'coordenacao'),
      ('${GESTOR_B}', '${GESTOR_B}', 'admin_instituicao', 'g@b.test', 'ativo', '${INST_B}', 'gestor');
  `);
  servico = new ImportacaoService(banco.db, armazenamento, new EscopoService(banco.db));
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

describe('importação: do upload à confirmação', () => {
  let id: string;

  it('cria com caminho escolhido pela API, não pelo nome do arquivo', async () => {
    const r = await servico.criar(COORD_A, {
      tipo: 'disciplinas',
      nomeArquivo: '../../etc/passwd.xlsx',
      tamanhoBytes: 1000,
    });
    id = r.id;
    expect(r.upload.path).toBe(`${INST_A}/${id}.xlsx`);
  });

  it('recebe o arquivo, confere o tipo real e sugere o mapeamento', async () => {
    arquivos.set(
      `${INST_A}/${id}.xlsx`,
      await gerarXlsx(
        ['Disciplina', 'Área do ENEM'],
        [
          ['Matemática', 'Matemática'],
          ['Física', 'Ciências da Natureza'],
          ['Artes', 'Artes'],
        ],
      ),
    );
    const r = await servico.arquivoEnviado(COORD_A, id);
    expect(r).toMatchObject({ formato: 'xlsx', totalLinhas: 3, mapeamentoSugerido: { nome: 0, area_enem: 1 } });
  });

  it('mostra a prévia com o motivo da recusa', async () => {
    const p = await servico.previa(COORD_A, id, { pagina: 1, porPagina: 100 });
    expect(p.resumo).toEqual({ criar: 2, atualizar: 0, sem_alteracao: 0, recusar: 1 });
    const recusadas = await servico.previa(COORD_A, id, { acao: 'recusar', pagina: 1, porPagina: 100 });
    expect(recusadas.linhas).toEqual([
      { linha: 4, acao: 'recusar', chave: 'Artes', nome: 'Artes', motivos: ['Área do ENEM desconhecida: "Artes".'] },
    ]);
  });

  it('recusa mapeamento sem o campo obrigatório', async () => {
    await expect(servico.salvarMapeamento(COORD_A, id, { nome: null, area_enem: 1 })).rejects.toMatchObject({
      response: { error: { code: 'MAPEAMENTO_INVALIDO' } },
    });
  });

  it('outra instituição não enxerga a importação', async () => {
    await expect(servico.obter(GESTOR_B, id)).rejects.toMatchObject({
      response: { error: { code: 'NAO_ENCONTRADO' } },
    });
  });

  it('confirma uma vez só, e audita', async () => {
    const confirmada = await servico.confirmar(COORD_A, 'admin_instituicao', id);
    expect(confirmada.status).toBe('pendente');
    await expect(servico.confirmar(COORD_A, 'admin_instituicao', id)).rejects.toMatchObject({
      response: { error: { code: 'ESTADO_INVALIDO' } },
    });
    const { rows } = await banco.pg.query<{ acao: string }>(
      `SELECT acao FROM audit_log WHERE entidade_id = $1`,
      [id],
    );
    expect(rows).toEqual([{ acao: 'importacao.confirmada' }]);
  });
});

describe('arquivo inválido', () => {
  it('PDF com extensão .csv é recusado e a importação fica marcada como falha', async () => {
    const { id } = await servico.criar(GESTOR_A, { tipo: 'alunos', nomeArquivo: 'alunos.csv', tamanhoBytes: 10 });
    arquivos.set(`${INST_A}/${id}.csv`, new TextEncoder().encode('%PDF-1.7 conteúdo'));
    await expect(servico.arquivoEnviado(GESTOR_A, id)).rejects.toMatchObject({
      response: { error: { code: 'ARQUIVO_INVALIDO' } },
    });
    expect((await servico.obter(GESTOR_A, id)).status).toBe('falhou');
  });
});

describe('exportação', () => {
  it('só a gestão exporta, e cada exportação é auditada', async () => {
    await banco.pg.exec(`
      INSERT INTO disciplina (instituicao_id, nome) VALUES ('${INST_A}', '=HYPERLINK("http://x")');
    `);
    await expect(servico.exportar(COORD_A, 'admin_instituicao', 'disciplinas')).rejects.toMatchObject({
      response: { error: { code: 'FORA_DO_ESCOPO' } },
    });
    const csv = await servico.exportar(GESTOR_A, 'admin_instituicao', 'disciplinas');
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    const { rows } = await banco.pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM audit_log WHERE acao = 'exportacao.realizada' AND instituicao_id = $1`,
      [INST_A],
    );
    expect(rows[0]!.n).toBe(1);
  });

  it('não leva dado de outra instituição', async () => {
    await banco.pg.exec(`INSERT INTO disciplina (instituicao_id, nome) VALUES ('${INST_B}', 'Só da B');`);
    expect(await servico.exportar(GESTOR_A, 'admin_instituicao', 'disciplinas')).not.toContain('Só da B');
  });
});

describe('importação de outra instituição', () => {
  let id: string;

  beforeAll(async () => {
    ({ id } = await servico.criar(GESTOR_A, { tipo: 'alunos', nomeArquivo: 'alunos.csv', tamanhoBytes: 100 }));
    arquivos.set(
      `${INST_A}/${id}.csv`,
      new TextEncoder().encode('matricula;nome\r\nM-1;Ana\r\nM-2;Bia\r\n'),
    );
    await servico.arquivoEnviado(GESTOR_A, id);
    await servico.previa(GESTOR_A, id, { pagina: 1, porPagina: 10 });
  });

  const NAO_ENCONTRADO = { response: { error: { code: 'NAO_ENCONTRADO' } } };

  async function estado() {
    const { rows } = await banco.pg.query('SELECT * FROM importacao WHERE id = $1', [id]);
    return JSON.stringify(rows);
  }

  it.each([
    ['obter', () => servico.obter(GESTOR_B, id)],
    ['arquivoEnviado', () => servico.arquivoEnviado(GESTOR_B, id)],
    ['salvarMapeamento', () => servico.salvarMapeamento(GESTOR_B, id, { matricula: 0, nome: 1 })],
    ['previa', () => servico.previa(GESTOR_B, id, { pagina: 1, porPagina: 10 })],
    ['confirmar', () => servico.confirmar(GESTOR_B, 'admin_instituicao', id)],
  ])('%s devolve "não encontrado" e não mexe na importação', async (_nome, chamar) => {
    const antes = await estado();
    await expect(chamar()).rejects.toMatchObject(NAO_ENCONTRADO);
    expect(await estado()).toBe(antes);
  });

  it('a lista da outra instituição não traz a importação', async () => {
    expect((await servico.listar(GESTOR_B)).map((i) => i.id)).not.toContain(id);
  });

  it('o dono ainda consegue seguir (o teste não é vazio)', async () => {
    expect((await servico.obter(GESTOR_A, id)).status).toBe('em_previa');
  });
});

describe('arquivo acima do limite no armazenamento', () => {
  it('10 MB + 1 byte: recusa, marca como falha e diz o motivo', async () => {
    const grande: ArmazenamentoPlanilhas = {
      urlDeUpload: async (path) => ({ path, token: 't' }),
      baixar: async () => {
        throw new ArquivoGrandeDemaisError();
      },
    };
    const comLimite = new ImportacaoService(banco.db, grande, new EscopoService(banco.db));
    const { id } = await comLimite.criar(GESTOR_A, { tipo: 'alunos', nomeArquivo: 'g.csv', tamanhoBytes: 10 });
    await expect(comLimite.arquivoEnviado(GESTOR_A, id)).rejects.toMatchObject({
      response: { error: { code: 'ARQUIVO_INVALIDO', message: expect.stringMatching(/10 MB/) } },
    });
    const importacao = await comLimite.obter(GESTOR_A, id);
    expect(importacao.status).toBe('falhou');
    expect(importacao.erro).toMatch(/10 MB/);
  });
});

describe('função padrão do admin de instituição', () => {
  const SEM_FUNCAO = '11111111-0000-4000-8000-0000000000aa';

  it('admin sem função gravada é coordenação: importa, mas não exporta', async () => {
    await banco.pg.exec(`
      INSERT INTO usuario (id, auth_uid, tipo_perfil, email, status, instituicao_id, funcao_instituicao)
      VALUES ('${SEM_FUNCAO}', '${SEM_FUNCAO}', 'admin_instituicao', 'sem@a.test', 'ativo', '${INST_A}', NULL)
    `);
    expect(await new EscopoService(banco.db).funcaoNaInstituicao(SEM_FUNCAO)).toEqual({
      instituicaoId: INST_A,
      funcao: 'coordenacao',
    });
    await expect(servico.exportar(SEM_FUNCAO, 'admin_instituicao', 'disciplinas')).rejects.toMatchObject({
      response: { error: { code: 'FORA_DO_ESCOPO' } },
    });
    await expect(servico.criar(SEM_FUNCAO, { tipo: 'alunos', nomeArquivo: 'a.csv', tamanhoBytes: 10 })).resolves.toBeDefined();
  });

  it('o gestor gravado de propósito exporta', async () => {
    await expect(servico.exportar(GESTOR_A, 'admin_instituicao', 'disciplinas')).resolves.toContain('nome');
  });
});

describe('privacidade da auditoria', () => {
  it('confirmação e exportação não gravam dado pessoal', async () => {
    const { rows } = await banco.pg.query('SELECT 1 FROM audit_log');
    expect(rows.length).toBeGreaterThan(0);
    expect(await acharPiiNoAuditLog(banco.pg)).toEqual([]);
  });
});
