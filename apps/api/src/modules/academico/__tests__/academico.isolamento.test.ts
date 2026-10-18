import { criarBancoDeTeste, type BancoDeTeste } from '@notaa/db/src/testing/banco-de-teste';
import {
  CriarDisciplinaRequestSchema,
  CriarPeriodoAvaliativoRequestSchema,
  CriarRegraAvaliativaRequestSchema,
  type RegraAvaliativa,
} from '@notaa/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ZodSchema } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { EscopoService } from '../../escopo/escopo.service';
import { AcademicoService } from '../academico.service';

// Tudo o que o serviço acadêmico escreve ou lista tem que parar na porta da
// instituição: id de outra instituição é "não encontrado" e nada muda, e o que
// o cliente manda além do schema nunca decide de quem é a linha.

const INST_A = '0000000a-0000-4000-8000-000000000000';
const INST_B = '0000000b-0000-4000-8000-000000000000';
const ANO = '00000a00-0000-4000-8000-000000000000';
const GESTOR_A = '11111111-0000-4000-8000-000000000001';
const COORD_A = '11111111-0000-4000-8000-000000000002';
const GESTOR_B = '11111111-0000-4000-8000-000000000003';
const TURMA_A = '000000a1-0000-4000-8000-000000000000';
const TURMA_B = '000000b1-0000-4000-8000-000000000000';
const PERIODO_B = 'b0000001-0000-4000-8000-000000000000';
const DISC_B = 'd000000b-0000-4000-8000-000000000000';

const regra = (): RegraAvaliativa => ({
  regime: { tipo: 'bimestral' },
  escala: { tipo: 'numerica', maximo: 10 },
  notaPeriodo: { tipo: 'media_aritmetica' },
  mediaFinal: { pesosPorPeriodo: [2, 2, 3, 3] },
  arredondamento: { tipo: 'normal', casas: 1 },
  recuperacao: { paralela: null, final: null },
  aprovacao: { mediaMinima: 6, frequenciaMinima: 0.75 },
  conselhoDeClasse: { habilitado: false, margemMaxima: null },
});

let banco: BancoDeTeste;
let servico: AcademicoService;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await banco.pg.exec(`
    INSERT INTO instituicao (id, nome) VALUES ('${INST_A}', 'A'), ('${INST_B}', 'B');
    INSERT INTO usuario (id, auth_uid, tipo_perfil, email, nome, status, instituicao_id, funcao_instituicao) VALUES
      ('${GESTOR_A}', '${GESTOR_A}', 'admin_instituicao', 'g@a.test', 'Gestora A', 'ativo', '${INST_A}', 'gestor'),
      ('${COORD_A}', '${COORD_A}', 'admin_instituicao', 'c@a.test', 'Coord A', 'ativo', '${INST_A}', 'coordenacao'),
      ('${GESTOR_B}', '${GESTOR_B}', 'admin_instituicao', 'g@b.test', 'Gestor B', 'ativo', '${INST_B}', 'gestor');
    INSERT INTO ano_letivo (id, rotulo) VALUES ('${ANO}', '2026');
    INSERT INTO ano_letivo_periodo (ano_letivo_id, instituicao_id) VALUES ('${ANO}', '${INST_A}'), ('${ANO}', '${INST_B}');
    INSERT INTO turma (id, instituicao_id, ano_letivo_id, nome) VALUES
      ('${TURMA_A}', '${INST_A}', '${ANO}', '1A'), ('${TURMA_B}', '${INST_B}', '${ANO}', '1A');
    INSERT INTO periodo_avaliativo (id, instituicao_id, ano_letivo_id, ordem, nome, data_inicio, data_fim)
      VALUES ('${PERIODO_B}', '${INST_B}', '${ANO}', 1, '1º bimestre B', '2026-02-01', '2026-04-15');
    INSERT INTO disciplina (id, instituicao_id, nome) VALUES ('${DISC_B}', '${INST_B}', 'Química');
    INSERT INTO turma_disciplina (turma_id, disciplina_id, instituicao_id) VALUES ('${TURMA_B}', '${DISC_B}', '${INST_B}');
  `);
  servico = new AcademicoService(banco.db, new EscopoService(banco.db));
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

async function fotoDasTabelas(): Promise<string> {
  const partes: unknown[] = [];
  for (const t of ['periodo_avaliativo', 'disciplina', 'turma_disciplina', 'regra_avaliativa']) {
    const { rows } = await banco.pg.query(`SELECT * FROM ${t} ORDER BY 1`);
    partes.push(rows);
  }
  return JSON.stringify(partes);
}

const NAO_ENCONTRADO = { response: { error: { code: 'NAO_ENCONTRADO' } } };

describe('id da outra instituição é "não encontrado" e nada muda', () => {
  it.each([
    ['atualizarPeriodo', () => servico.atualizarPeriodo(GESTOR_A, PERIODO_B, { nome: 'invadido' })],
    ['removerPeriodo', () => servico.removerPeriodo(GESTOR_A, PERIODO_B)],
    ['atualizarDisciplina', () => servico.atualizarDisciplina(GESTOR_A, DISC_B, { nome: 'invadida' })],
  ])('%s', async (_nome, chamar) => {
    const antes = await fotoDasTabelas();
    await expect(chamar()).rejects.toMatchObject(NAO_ENCONTRADO);
    expect(await fotoDasTabelas()).toBe(antes);
  });

  it.each([
    ['listarPeriodos', () => servico.listarPeriodos(GESTOR_A, '00000a00-0000-4000-8000-0000000000ff')],
    ['listarDisciplinasDaTurma', () => servico.listarDisciplinasDaTurma(GESTOR_A, TURMA_B)],
    ['removerDisciplinaDaTurma', () => servico.removerDisciplinaDaTurma(GESTOR_A, TURMA_B, DISC_B)],
  ])('%s, com turma ou ano que não é da instituição', async (_nome, chamar) => {
    const antes = await fotoDasTabelas();
    await expect(chamar()).rejects.toMatchObject({ status: expect.any(Number) });
    expect(await fotoDasTabelas()).toBe(antes);
  });

  it('o gestor da B ainda enxerga e altera o que é dele (o teste não é vazio)', async () => {
    const [p] = await servico.listarPeriodos(GESTOR_B, ANO);
    expect(p!.id).toBe(PERIODO_B);
    expect((await servico.atualizarPeriodo(GESTOR_B, PERIODO_B, { nome: '1º trimestre B' })).nome).toBe(
      '1º trimestre B',
    );
  });
});

describe('o que vem além do schema não decide de quem é a linha', () => {
  const comPipe = <T>(schema: ZodSchema, corpo: unknown): T =>
    new ZodValidationPipe(schema).transform(corpo) as T;

  it('criarPeriodo: instituicaoId extra no corpo é descartado pelo schema', async () => {
    const corpo = comPipe<Parameters<AcademicoService['criarPeriodo']>[1]>(
      CriarPeriodoAvaliativoRequestSchema,
      { anoLetivoId: ANO, ordem: 1, nome: '1º', dataInicio: '2026-02-01', dataFim: '2026-04-15', instituicaoId: INST_B },
    );
    expect(corpo).not.toHaveProperty('instituicaoId');
    const criado = await servico.criarPeriodo(GESTOR_A, corpo);
    const { rows } = await banco.pg.query<{ instituicao_id: string }>(
      'SELECT instituicao_id FROM periodo_avaliativo WHERE id = $1',
      [criado.id],
    );
    expect(rows[0]!.instituicao_id).toBe(INST_A);
  });

  it('criarPeriodo: mesmo sem o schema no caminho, o serviço grava na instituição do token', async () => {
    const corpoCru = {
      anoLetivoId: ANO, ordem: 2, nome: '2º', dataInicio: '2026-04-16', dataFim: '2026-06-30', instituicaoId: INST_B,
    } as Parameters<AcademicoService['criarPeriodo']>[1];
    const criado = await servico.criarPeriodo(GESTOR_A, corpoCru);
    const { rows } = await banco.pg.query<{ instituicao_id: string }>(
      'SELECT instituicao_id FROM periodo_avaliativo WHERE id = $1',
      [criado.id],
    );
    expect(rows[0]!.instituicao_id).toBe(INST_A);
  });

  it('atualizarPeriodo e atualizarDisciplina: instituicaoId extra não muda a linha de instituição', async () => {
    const periodo = await servico.criarPeriodo(GESTOR_A, {
      anoLetivoId: ANO, ordem: 9, nome: 'Extra', dataInicio: '2026-11-01', dataFim: '2026-11-30',
    });
    await servico.atualizarPeriodo(GESTOR_A, periodo.id, {
      nome: 'Extra 2', instituicaoId: INST_B,
    } as Parameters<AcademicoService['atualizarPeriodo']>[2]);
    const disciplina = await servico.criarDisciplina(GESTOR_A, { nome: 'Latim' });
    await servico.atualizarDisciplina(GESTOR_A, disciplina.id, {
      nome: 'Latim 2', instituicaoId: INST_B,
    } as Parameters<AcademicoService['atualizarDisciplina']>[2]);
    for (const [tabela, id] of [['periodo_avaliativo', periodo.id], ['disciplina', disciplina.id]] as const) {
      const { rows } = await banco.pg.query<{ instituicao_id: string }>(
        `SELECT instituicao_id FROM ${tabela} WHERE id = $1`, [id],
      );
      expect(rows[0]!.instituicao_id, tabela).toBe(INST_A);
    }
  });

  it('criarDisciplina: instituicaoId extra é descartado e a linha nasce na A', async () => {
    const corpo = comPipe<Parameters<AcademicoService['criarDisciplina']>[1]>(
      CriarDisciplinaRequestSchema,
      { nome: 'Geografia', instituicaoId: INST_B },
    );
    expect(corpo).not.toHaveProperty('instituicaoId');
    const criada = await servico.criarDisciplina(GESTOR_A, corpo);
    const { rows } = await banco.pg.query<{ instituicao_id: string }>(
      'SELECT instituicao_id FROM disciplina WHERE id = $1',
      [criada.id],
    );
    expect(rows[0]!.instituicao_id).toBe(INST_A);
  });

  it('criarRegra: instituicaoId e criadoPor extras são descartados', async () => {
    const corpo = comPipe<Parameters<AcademicoService['criarRegra']>[2]>(
      CriarRegraAvaliativaRequestSchema,
      { anoLetivoId: ANO, regra: regra(), justificativa: 'Primeira versão do ano letivo.', instituicaoId: INST_B, criadoPor: GESTOR_B },
    );
    expect(corpo).not.toHaveProperty('instituicaoId');
    expect(corpo).not.toHaveProperty('criadoPor');
    const criada = await servico.criarRegra(GESTOR_A, 'admin_instituicao', corpo);
    const { rows } = await banco.pg.query<{ instituicao_id: string; criado_por: string }>(
      'SELECT instituicao_id, criado_por FROM regra_avaliativa WHERE id = $1',
      [criada.id],
    );
    expect(rows[0]).toEqual({ instituicao_id: INST_A, criado_por: GESTOR_A });
  });
});

describe('coordenação configura, mas não exporta nem lê a auditoria', () => {
  it('cria período e disciplina como a gestão', async () => {
    const periodo = await servico.criarPeriodo(COORD_A, {
      anoLetivoId: ANO, ordem: 3, nome: '3º', dataInicio: '2026-08-01', dataFim: '2026-09-30',
    });
    expect(periodo.ordem).toBe(3);
    expect((await servico.criarDisciplina(COORD_A, { nome: 'Sociologia' })).nome).toBe('Sociologia');
  });

  it('não lê o audit_log (RLS), mesmo tendo escrito a configuração', async () => {
    await banco.pg.exec(
      `INSERT INTO audit_log (instituicao_id, ator_id, papel, acao, entidade)
       VALUES ('${INST_A}', '${GESTOR_A}', 'admin_instituicao', 'regra.criada', 'regra_avaliativa')`,
    );
    const { rows } = await banco.comoUsuario(COORD_A, (query) => query('SELECT 1 FROM audit_log'));
    expect(rows).toHaveLength(0);
    const gestor = await banco.comoUsuario(GESTOR_A, (query) => query('SELECT 1 FROM audit_log'));
    expect(gestor.rows.length).toBeGreaterThan(0);
  });
});
