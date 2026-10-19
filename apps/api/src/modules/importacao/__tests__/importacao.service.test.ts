import { criarBancoDeTeste, type BancoDeTeste } from '@notaa/db/src/testing/banco-de-teste';
import { gerarXlsx } from '@notaa/importacao';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EscopoService } from '../../escopo/escopo.service';
import type { ArmazenamentoPlanilhas } from '../armazenamento';
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
