import { AtivarRegraRequestSchema, CriarRegraAvaliativaRequestSchema, type RegraAvaliativa } from '@notaa/contracts';
import { acharPiiNoAuditLog } from '@notaa/db/src/testing/audit-sem-pii';
import { criarBancoDeTeste, type BancoDeTeste } from '@notaa/db/src/testing/banco-de-teste';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EscopoService } from '../../escopo/escopo.service';
import { AcademicoService } from '../academico.service';

// Integridade acadêmica: com regra ativa os períodos não mudam de quantidade,
// toda escrita acadêmica deixa um registro de auditoria com ator e papel, e
// criar ou ativar uma versão da regra exige um motivo, gravado na auditoria.

const INST = '0000000a-0000-4000-8000-000000000000';
const ANO = '00000a00-0000-4000-8000-000000000000';
const ANO_2 = '00000a00-0000-4000-8000-000000000002';
const GESTOR = '11111111-0000-4000-8000-000000000001';
const COORD = '11111111-0000-4000-8000-000000000002';
const PROF = '11111111-0000-4000-8000-000000000003';
const TURMA = '000000a1-0000-4000-8000-000000000000';
const PAPEL = 'admin_instituicao';
const MOTIVO = 'Ajuste combinado com o conselho pedagógico.';

const regra = (mediaMinima = 6): RegraAvaliativa => ({
  regime: { tipo: 'bimestral' },
  escala: { tipo: 'numerica', maximo: 10 },
  notaPeriodo: { tipo: 'media_aritmetica' },
  mediaFinal: { pesosPorPeriodo: [2, 2, 3, 3] },
  arredondamento: { tipo: 'normal', casas: 1 },
  recuperacao: { paralela: null, final: null },
  aprovacao: { mediaMinima, frequenciaMinima: 0.75, abonaFaltaJustificada: false },
  conselhoDeClasse: { habilitado: false, margemMaxima: null },
});

const DATAS = [
  ['2026-02-01', '2026-04-15'],
  ['2026-04-16', '2026-06-30'],
  ['2026-08-01', '2026-09-30'],
  ['2026-10-01', '2026-12-15'],
] as const;

let banco: BancoDeTeste;
let servico: AcademicoService;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await banco.pg.exec(`
    INSERT INTO instituicao (id, nome) VALUES ('${INST}', 'A');
    INSERT INTO usuario (id, auth_uid, tipo_perfil, email, nome, status, instituicao_id, funcao_instituicao) VALUES
      ('${GESTOR}', '${GESTOR}', 'admin_instituicao', 'g@a.test', 'Gestora', 'ativo', '${INST}', 'gestor'),
      ('${COORD}', '${COORD}', 'admin_instituicao', 'c@a.test', 'Coord', 'ativo', '${INST}', 'coordenacao'),
      ('${PROF}', '${PROF}', 'professor_institucional', 'p@a.test', 'Prof', 'ativo', '${INST}', NULL);
    INSERT INTO ano_letivo (id, rotulo) VALUES ('${ANO}', '2026'), ('${ANO_2}', '2027');
    INSERT INTO ano_letivo_periodo (ano_letivo_id, instituicao_id) VALUES ('${ANO}', '${INST}'), ('${ANO_2}', '${INST}');
    INSERT INTO turma (id, instituicao_id, ano_letivo_id, nome) VALUES ('${TURMA}', '${INST}', '${ANO}', '1A');
    INSERT INTO professor_turma (turma_id, professor_id) VALUES ('${TURMA}', '${PROF}');
  `);
  servico = new AcademicoService(banco.db, new EscopoService(banco.db));
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

interface Linha {
  acao: string;
  entidade: string;
  entidade_id: string | null;
  ator_id: string;
  papel: string;
  dados: Record<string, unknown>;
}
const auditoria = async (filtro = 'true', params: unknown[] = []) =>
  (await banco.pg.query<Linha>(
    `SELECT acao, entidade, entidade_id, ator_id, papel, dados FROM audit_log WHERE ${filtro} ORDER BY criado_em, id`,
    params,
  )).rows;
const totalAuditoria = async () => (await auditoria()).length;
const totalPeriodos = async (ano: string) =>
  (await banco.pg.query<{ n: number }>('SELECT count(*)::int AS n FROM periodo_avaliativo WHERE ano_letivo_id = $1', [ano])).rows[0]!.n;

async function criarQuatroPeriodos(ano: string, quem = GESTOR) {
  const ids: string[] = [];
  for (const [i, [dataInicio, dataFim]] of DATAS.entries()) {
    const p = await servico.criarPeriodo(quem, { anoLetivoId: ano, ordem: i + 1, nome: `${i + 1}º bimestre`, dataInicio, dataFim });
    ids.push(p.id);
  }
  return ids;
}

describe('justificativa da regra', () => {
  it('o contrato exige 15 caracteres, depois de aparar os espaços', () => {
    const base = { anoLetivoId: ANO, regra: regra() };
    expect(CriarRegraAvaliativaRequestSchema.safeParse(base).success).toBe(false);
    expect(CriarRegraAvaliativaRequestSchema.safeParse({ ...base, justificativa: 'x'.repeat(14) }).success).toBe(false);
    expect(CriarRegraAvaliativaRequestSchema.safeParse({ ...base, justificativa: `   ${'x'.repeat(14)}   ` }).success).toBe(false);
    expect(CriarRegraAvaliativaRequestSchema.safeParse({ ...base, justificativa: 'x'.repeat(15) }).success).toBe(true);
    expect(AtivarRegraRequestSchema.safeParse({}).success).toBe(false);
    expect(AtivarRegraRequestSchema.safeParse({ justificativa: 'x'.repeat(14) }).success).toBe(false);
    expect(AtivarRegraRequestSchema.safeParse({ justificativa: 'x'.repeat(15) }).success).toBe(true);
  });

  it('o serviço também recusa, mesmo que o pipe seja contornado', async () => {
    const antes = await totalAuditoria();
    await expect(
      servico.criarRegra(GESTOR, PAPEL, { anoLetivoId: ANO, regra: regra(), justificativa: 'curta' }),
    ).rejects.toMatchObject({ response: { error: { code: 'JUSTIFICATIVA_INVALIDA' } } });
    await expect(
      servico.criarRegra(GESTOR, PAPEL, { anoLetivoId: ANO, regra: regra() } as never),
    ).rejects.toMatchObject({ response: { error: { code: 'JUSTIFICATIVA_INVALIDA' } } });
    expect((await banco.pg.query('SELECT 1 FROM regra_avaliativa')).rows).toHaveLength(0);
    expect(await totalAuditoria()).toBe(antes);
  });

  it('criar grava o motivo, sem os espaços das pontas, na auditoria', async () => {
    const v = await servico.criarRegra(GESTOR, PAPEL, {
      anoLetivoId: ANO,
      regra: regra(),
      justificativa: `  ${MOTIVO}  `,
    });
    const [linha] = await auditoria(`acao = 'regra.criada' AND entidade_id = $1`, [v.id]);
    expect(linha).toMatchObject({ ator_id: GESTOR, papel: PAPEL });
    expect(linha!.dados).toEqual({ anoLetivoId: ANO, versao: 1, justificativa: MOTIVO });
  });

  it('ativar sem motivo é recusado e nada é gravado', async () => {
    const [v] = await servico.listarRegras(GESTOR, ANO);
    await criarQuatroPeriodos(ANO);
    const antes = await totalAuditoria();
    await expect(
      servico.ativarRegra(GESTOR, PAPEL, v!.id, { justificativa: '' }),
    ).rejects.toMatchObject({ response: { error: { code: 'JUSTIFICATIVA_INVALIDA' } } });
    expect((await servico.listarRegras(GESTOR, ANO))[0]!.ativa).toBe(false);
    expect(await totalAuditoria()).toBe(antes);
  });
});

describe('períodos com regra ativa', () => {
  let v1: string;
  let v2: string;
  let periodoId: string;

  it('prepara: quatro bimestres e a v1 ativa', async () => {
    v1 = (await servico.listarRegras(GESTOR, ANO))[0]!.id;
    v2 = (await servico.criarRegra(COORD, PAPEL, { anoLetivoId: ANO, regra: regra(7), justificativa: 'Média mínima sobe para 7 em 2026.' })).id;
    await servico.ativarRegra(GESTOR, PAPEL, v1, { justificativa: 'Primeira regra do ano, aprovada em reunião.' });
    const periodos = await servico.listarPeriodos(GESTOR, ANO);
    periodoId = periodos[1]!.id;
    expect(periodos).toHaveLength(4);
  });

  it('remover um período muda a contagem: 409 e nada muda nem é auditado', async () => {
    const antes = await totalAuditoria();
    await expect(servico.removerPeriodo(GESTOR, periodoId)).rejects.toMatchObject({
      response: { error: { code: 'PERIODOS_COM_REGRA_ATIVA' } },
    });
    expect(await totalPeriodos(ANO)).toBe(4);
    expect(await totalAuditoria()).toBe(antes);
  });

  it('criar o quinto período também muda a contagem: 409', async () => {
    await expect(
      servico.criarPeriodo(GESTOR, { anoLetivoId: ANO, ordem: 5, nome: '5º', dataInicio: '2027-01-05', dataFim: '2027-01-20' }),
    ).rejects.toMatchObject({ response: { error: { code: 'PERIODOS_COM_REGRA_ATIVA' } } });
    expect(await totalPeriodos(ANO)).toBe(4);
  });

  it('atualizar nome e datas não muda a contagem: funciona e audita antes e depois', async () => {
    const antes = await totalAuditoria();
    const p = await servico.atualizarPeriodo(GESTOR, periodoId, { nome: '2º bimestre (revisado)', dataFim: '2026-07-05' });
    expect(p).toMatchObject({ nome: '2º bimestre (revisado)', dataFim: '2026-07-05' });
    const linhas = await auditoria(`acao = 'periodo.atualizado'`);
    expect(await totalAuditoria()).toBe(antes + 1);
    expect(linhas.at(-1)).toMatchObject({ ator_id: GESTOR, papel: PAPEL, entidade: 'periodo_avaliativo', entidade_id: periodoId });
    expect(linhas.at(-1)!.dados).toEqual({
      anoLetivoId: ANO,
      campos: ['nome', 'dataFim'],
      antes: { nome: '2º bimestre', dataFim: '2026-06-30' },
      depois: { nome: '2º bimestre (revisado)', dataFim: '2026-07-05' },
    });
  });

  it('outro ano, sem regra ativa, aceita criar e remover, e audita os dois', async () => {
    const antes = await totalAuditoria();
    const ids = await criarQuatroPeriodos(ANO_2);
    await servico.removerPeriodo(COORD, ids[3]!);
    expect(await totalPeriodos(ANO_2)).toBe(3);
    const novas = (await auditoria()).slice(antes);
    expect(novas.map((l) => l.acao)).toEqual([
      'periodo.criado', 'periodo.criado', 'periodo.criado', 'periodo.criado', 'periodo.removido',
    ]);
    expect(novas.at(-1)).toMatchObject({ ator_id: COORD, papel: PAPEL, entidade_id: ids[3] });
    expect(novas.at(-1)!.dados).toMatchObject({ anoLetivoId: ANO_2, ordem: 4 });
  });

  it('reativar a v1 com a v2 vigente grava regra.ativada com ator, motivo e a versão que ela substitui', async () => {
    await servico.ativarRegra(GESTOR, PAPEL, v2, { justificativa: 'Vigora a média 7 a partir de agora.' });
    await servico.ativarRegra(COORD, PAPEL, v1, { justificativa: 'Voltamos à média 6 por decisão do conselho.' });
    const linhas = await auditoria(`acao = 'regra.ativada'`);
    expect(linhas.map((l) => l.dados.reativacao)).toEqual([false, false, true]);
    expect(linhas[0]!.dados).toMatchObject({ regraAnteriorId: null });
    expect(linhas[1]!.dados).toMatchObject({ regraAnteriorId: v1, reativacao: false });
    expect(linhas[2]).toMatchObject({ ator_id: COORD, papel: PAPEL, entidade_id: v1 });
    expect(linhas[2]!.dados).toEqual({
      anoLetivoId: ANO,
      versao: 1,
      justificativa: 'Voltamos à média 6 por decisão do conselho.',
      reativacao: true,
      regraAnteriorId: v2,
    });
    expect((await servico.listarRegras(GESTOR, ANO)).find((v) => v.ativa)!.id).toBe(v1);
  });

  it('ativar a versão que já é a vigente não duplica a auditoria', async () => {
    const antes = await auditoria(`acao = 'regra.ativada'`);
    await servico.ativarRegra(GESTOR, PAPEL, v1, { justificativa: 'Confirmando a regra que já vigora.' });
    expect(await auditoria(`acao = 'regra.ativada'`)).toHaveLength(antes.length);
  });
});

describe('toda escrita acadêmica deixa um registro, com ator e papel', () => {
  it('disciplina: criar, atualizar, atribuir, trocar o professor e remover', async () => {
    const antes = await totalAuditoria();

    const d = await servico.criarDisciplina(GESTOR, { nome: 'Matemática', areaEnem: 'matematica' });
    await servico.atualizarDisciplina(COORD, d.id, { codigo: 'MAT', areaEnem: 'natureza' });
    await servico.atribuirDisciplina(GESTOR, TURMA, d.id, { professorId: null });
    await servico.atribuirDisciplina(GESTOR, TURMA, d.id, { professorId: PROF });
    await servico.removerDisciplinaDaTurma(COORD, TURMA, d.id);
    await servico.removerDisciplinaDaTurma(COORD, TURMA, d.id); // já removida: nada a registrar

    const novas = (await auditoria()).slice(antes);
    expect(novas.map((l) => l.acao)).toEqual([
      'disciplina.criada',
      'disciplina.atualizada',
      'disciplina.atribuida',
      'disciplina.atribuida',
      'disciplina.removida_da_turma',
    ]);
    for (const l of novas) expect(l).toMatchObject({ papel: PAPEL, entidade_id: d.id });
    expect(novas.map((l) => l.ator_id)).toEqual([GESTOR, COORD, GESTOR, GESTOR, COORD]);
    expect(novas[1]!.dados).toEqual({
      campos: ['codigo', 'areaEnem'],
      antes: { codigo: null, areaEnem: 'matematica' },
      depois: { codigo: 'MAT', areaEnem: 'natureza' },
    });
    expect(novas[3]!.dados).toEqual({ turmaId: TURMA, professorId: PROF, professorAnteriorId: null });
    expect(novas[4]!.dados).toEqual({ turmaId: TURMA });
  });

  it('é tudo ou nada: se a auditoria falha, a escrita desfaz', async () => {
    await banco.pg.exec(`ALTER TABLE audit_log ADD CONSTRAINT ck_teste_sem_periodo CHECK (acao <> 'periodo.criado') NOT VALID`);
    try {
      const antes = await totalPeriodos(ANO_2);
      await expect(
        servico.criarPeriodo(GESTOR, { anoLetivoId: ANO_2, ordem: 4, nome: '4º', dataInicio: '2027-10-01', dataFim: '2027-12-15' }),
      ).rejects.toThrow();
      expect(await totalPeriodos(ANO_2)).toBe(antes);
    } finally {
      await banco.pg.exec('ALTER TABLE audit_log DROP CONSTRAINT ck_teste_sem_periodo');
    }
  });

  it('a recusa por conflito (período duplicado) não deixa auditoria', async () => {
    const antes = await totalAuditoria();
    await expect(
      servico.criarPeriodo(GESTOR, { anoLetivoId: ANO_2, ordem: 1, nome: 'dup', dataInicio: '2027-02-01', dataFim: '2027-03-01' }),
    ).rejects.toMatchObject({ response: { error: { code: 'PERIODO_DUPLICADO' } } });
    expect(await totalAuditoria()).toBe(antes);
  });

  it('nada do que foi auditado aqui identifica uma pessoa', async () => {
    expect(await acharPiiNoAuditLog(banco.pg)).toEqual([]);
  });
});
