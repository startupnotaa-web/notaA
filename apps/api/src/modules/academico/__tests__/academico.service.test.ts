import type { RegraAvaliativa } from '@notaa/contracts';
import { criarBancoDeTeste, type BancoDeTeste } from '@notaa/db/src/testing/banco-de-teste';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EscopoService } from '../../escopo/escopo.service';
import { AcademicoService } from '../academico.service';

// Serviço acadêmico contra Postgres de verdade (PGlite em memória, migrações
// reais). O que se prova aqui: versão nova não altera a anterior, ativação
// confere os períodos, e nada atravessa de uma instituição para outra.

const INST_A = '0000000a-0000-4000-8000-000000000000';
const INST_B = '0000000b-0000-4000-8000-000000000000';
const ANO = '00000a00-0000-4000-8000-000000000000';
const GESTOR_A = '11111111-0000-4000-8000-000000000001';
const COORD_A = '11111111-0000-4000-8000-000000000002';
const GESTOR_B = '11111111-0000-4000-8000-000000000003';
const PROF_A = '11111111-0000-4000-8000-000000000004';
const TURMA_A = '000000a1-0000-4000-8000-000000000000';
const TURMA_B = '000000b1-0000-4000-8000-000000000000';

function regra(overrides: Partial<RegraAvaliativa> = {}): RegraAvaliativa {
  return {
    regime: { tipo: 'bimestral' },
    escala: { tipo: 'numerica', maximo: 10 },
    notaPeriodo: { tipo: 'media_aritmetica' },
    mediaFinal: { pesosPorPeriodo: [2, 2, 3, 3] },
    arredondamento: { tipo: 'normal', casas: 1 },
    recuperacao: { paralela: null, final: null },
    aprovacao: { mediaMinima: 6, frequenciaMinima: 0.75 },
    conselhoDeClasse: { habilitado: false, margemMaxima: null },
    ...overrides,
  };
}

let banco: BancoDeTeste;
let servico: AcademicoService;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await banco.pg.exec(`
    INSERT INTO instituicao (id, nome) VALUES ('${INST_A}', 'A'), ('${INST_B}', 'B');
    INSERT INTO usuario (id, auth_uid, tipo_perfil, email, nome, status, instituicao_id, funcao_instituicao) VALUES
      ('${GESTOR_A}', '${GESTOR_A}', 'admin_instituicao', 'g@a.test', 'Gestora A', 'ativo', '${INST_A}', 'gestor'),
      ('${COORD_A}', '${COORD_A}', 'admin_instituicao', 'c@a.test', 'Coord A', 'ativo', '${INST_A}', 'coordenacao'),
      ('${GESTOR_B}', '${GESTOR_B}', 'admin_instituicao', 'g@b.test', 'Gestor B', 'ativo', '${INST_B}', 'gestor'),
      ('${PROF_A}', '${PROF_A}', 'professor_institucional', 'p@a.test', 'Prof A', 'ativo', '${INST_A}', NULL);
    INSERT INTO ano_letivo (id, rotulo) VALUES ('${ANO}', '2026');
    INSERT INTO ano_letivo_periodo (ano_letivo_id, instituicao_id) VALUES ('${ANO}', '${INST_A}'), ('${ANO}', '${INST_B}');
    INSERT INTO turma (id, instituicao_id, ano_letivo_id, nome) VALUES
      ('${TURMA_A}', '${INST_A}', '${ANO}', '1A'), ('${TURMA_B}', '${INST_B}', '${ANO}', '1A');
    INSERT INTO professor_turma (turma_id, professor_id) VALUES ('${TURMA_A}', '${PROF_A}');
  `);
  servico = new AcademicoService(banco.db, new EscopoService(banco.db));
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

describe('regra avaliativa versionada', () => {
  let v1: string;

  it('mudar a regra cria versão nova sem alterar a anterior', async () => {
    const primeira = await servico.criarRegra(GESTOR_A, 'admin_instituicao', {
      anoLetivoId: ANO,
      regra: regra(),
    });
    v1 = primeira.id;
    const { rows: antes } = await banco.pg.query('SELECT * FROM regra_avaliativa WHERE id = $1', [v1]);

    const segunda = await servico.criarRegra(COORD_A, 'admin_instituicao', {
      anoLetivoId: ANO,
      regra: regra({ aprovacao: { mediaMinima: 7, frequenciaMinima: 0.8 } }),
    });
    expect([primeira.versao, segunda.versao]).toEqual([1, 2]);

    const { rows: depois } = await banco.pg.query('SELECT * FROM regra_avaliativa WHERE id = $1', [v1]);
    expect(depois).toEqual(antes);
    const versoes = await servico.listarRegras(GESTOR_A, ANO);
    expect(versoes.map((v) => [v.versao, v.regra.aprovacao.mediaMinima, v.ativa])).toEqual([
      [2, 7, false],
      [1, 6, false],
    ]);
  });

  it('não ativa enquanto os períodos não batem com o regime', async () => {
    await expect(servico.ativarRegra(GESTOR_A, 'admin_instituicao', v1)).rejects.toMatchObject({
      response: { error: { code: 'PERIODOS_NAO_CONFEREM' } },
    });
  });

  it('ativa depois de cadastrar os quatro bimestres, e só uma versão fica vigente', async () => {
    const datas = [
      ['2026-02-01', '2026-04-15'],
      ['2026-04-16', '2026-06-30'],
      ['2026-08-01', '2026-09-30'],
      ['2026-10-01', '2026-12-15'],
    ];
    for (const [i, [dataInicio, dataFim]] of datas.entries()) {
      await servico.criarPeriodo(GESTOR_A, {
        anoLetivoId: ANO,
        ordem: i + 1,
        nome: `${i + 1}º bimestre`,
        dataInicio: dataInicio!,
        dataFim: dataFim!,
      });
    }
    const ativa = await servico.ativarRegra(GESTOR_A, 'admin_instituicao', v1);
    expect(ativa).toMatchObject({ versao: 1, ativa: true });
    expect((await servico.regraAtiva(PROF_A, ANO))?.versao).toBe(1);
  });

  it('grava na auditoria a criação e a ativação', async () => {
    const { rows } = await banco.pg.query<{ acao: string }>(
      `SELECT acao FROM audit_log WHERE instituicao_id = $1 ORDER BY criado_em, acao`,
      [INST_A],
    );
    expect(rows.map((r) => r.acao)).toEqual(['regra.criada', 'regra.criada', 'regra.ativada']);
  });

  it('outra instituição não vê nem ativa a regra', async () => {
    expect(await servico.listarRegras(GESTOR_B, ANO)).toEqual([]);
    expect(await servico.regraAtiva(GESTOR_B, ANO)).toBeNull();
    await expect(servico.ativarRegra(GESTOR_B, 'admin_instituicao', v1)).rejects.toMatchObject({
      response: { error: { code: 'NAO_ENCONTRADO' } },
    });
  });
});

describe('disciplinas e atribuição', () => {
  it('atribui disciplina com professor que leciona na turma', async () => {
    const mat = await servico.criarDisciplina(GESTOR_A, { nome: 'Matemática', areaEnem: 'matematica' });
    const lista = await servico.atribuirDisciplina(GESTOR_A, TURMA_A, mat.id, { professorId: PROF_A });
    expect(lista).toEqual([
      {
        turmaId: TURMA_A,
        disciplina: { id: mat.id, nome: 'Matemática', areaEnem: 'matematica' },
        professor: { id: PROF_A, nome: 'Prof A' },
      },
    ]);
  });

  it('recusa disciplina de outra instituição e turma de outra instituição', async () => {
    const fisicaB = await servico.criarDisciplina(GESTOR_B, { nome: 'Física' });
    await expect(
      servico.atribuirDisciplina(GESTOR_A, TURMA_A, fisicaB.id, { professorId: null }),
    ).rejects.toMatchObject({ response: { error: { code: 'NAO_ENCONTRADO' } } });
    const [matA] = await servico.listarDisciplinas(GESTOR_A);
    await expect(
      servico.atribuirDisciplina(GESTOR_B, TURMA_A, matA!.id, { professorId: null }),
    ).rejects.toMatchObject({ response: { error: { code: 'FORA_DO_ESCOPO' } } });
  });

  it('recusa professor que não leciona na turma', async () => {
    const hist = await servico.criarDisciplina(GESTOR_A, { nome: 'História', areaEnem: 'humanas' });
    await expect(
      servico.atribuirDisciplina(GESTOR_A, TURMA_A, hist.id, { professorId: GESTOR_B }),
    ).rejects.toMatchObject({ response: { error: { code: 'PROFESSOR_FORA_DA_TURMA' } } });
  });

  it('recusa nome de disciplina repetido na mesma instituição', async () => {
    await expect(servico.criarDisciplina(GESTOR_A, { nome: 'Matemática' })).rejects.toMatchObject({
      response: { error: { code: 'DISCIPLINA_DUPLICADA' } },
    });
  });
});

describe('simulação', () => {
  it('calcula sem gravar nada', async () => {
    const { rows: antes } = await banco.pg.query('SELECT count(*) FROM regra_avaliativa');
    const { resultados } = servico.simular({
      regra: regra(),
      alunos: [{ rotulo: 'Ana', notasPorPeriodo: [[5], [6], [7], [8]], frequencia: 0.9 }],
    });
    expect(resultados[0]).toMatchObject({ mediaFinal: 6.7, situacao: 'aprovado' });
    const { rows: depois } = await banco.pg.query('SELECT count(*) FROM regra_avaliativa');
    expect(depois).toEqual(antes);
  });
});
