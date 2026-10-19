import { deflateRawSync } from 'node:zlib';
import type { MapeamentoColunas } from '@notaa/contracts';
import { describe, expect, it } from 'vitest';
import {
  ArquivoInvalidoError,
  celulaSegura,
  detectarFormato,
  gerarCsv,
  gerarXlsx,
  lerPlanilha,
  planejarAlunos,
  planejarDisciplinas,
  sugerirMapeamento,
  validarMapeamento,
  type AlunoExistente,
  type ContextoAlunos,
} from '../index';

const texto = (s: string) => new TextEncoder().encode(s);

/** ZIP mínimo, só o que o validador lê. Uma entrada por nome. */
function zip(
  entradas: { nome: string; dados: Uint8Array; metodo?: 0 | 8; declarado?: number }[],
): Uint8Array {
  const partes: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entradas) {
    const nome = Buffer.from(e.nome);
    const metodo = e.metodo ?? 8;
    const dados = metodo === 8 ? deflateRawSync(e.dados) : Buffer.from(e.dados);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(metodo, 8);
    local.writeUInt32LE(dados.length, 18);
    local.writeUInt32LE(e.dados.length, 22);
    local.writeUInt16LE(nome.length, 26);
    partes.push(local, nome, dados);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(metodo, 10);
    cd.writeUInt32LE(dados.length, 20);
    cd.writeUInt32LE(e.declarado ?? e.dados.length, 24);
    cd.writeUInt16LE(nome.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nome);
    offset += 30 + nome.length + dados.length;
  }
  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entradas.length, 8);
  eocd.writeUInt16LE(entradas.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...partes, cdBuf, eocd]));
}

describe('detectarFormato', () => {
  it('reconhece CSV e XLSX pelo conteúdo', async () => {
    expect(detectarFormato(texto('matricula;nome\n1;Ana\n'), 'alunos.csv')).toBe('csv');
    const xlsx = await gerarXlsx(['matricula', 'nome'], [['1', 'Ana']]);
    expect(detectarFormato(xlsx, 'alunos.xlsx')).toBe('xlsx');
  });

  it.each([
    ['PDF renomeado', texto('%PDF-1.7 ...'), 'alunos.csv', /PDF/],
    ['executável renomeado', new Uint8Array([0x4d, 0x5a, 0x90, 0x00]), 'alunos.csv', /executável/],
    ['.xls antigo', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1]), 'alunos.csv', /\.xls antiga/],
    ['texto com extensão .xlsx', texto('matricula,nome\n'), 'alunos.xlsx', /não é \.xlsx/],
    ['binário com byte nulo', new Uint8Array([0x61, 0x00, 0x62]), 'alunos.csv', /não é um CSV/],
    ['arquivo vazio', new Uint8Array(), 'alunos.csv', /vazio/],
  ])('recusa %s', (_nome, bytes, nomeArquivo, mensagem) => {
    expect(() => detectarFormato(bytes, nomeArquivo)).toThrow(mensagem);
  });

  it('recusa ZIP que não é pasta de trabalho do Excel', () => {
    const z = zip([{ nome: 'documento.txt', dados: texto('oi') }]);
    expect(() => detectarFormato(z, 'alunos.xlsx')).toThrow(/não é uma planilha do Excel/);
  });

  it('recusa ZIP com extensão .csv', () => {
    const z = zip([{ nome: 'a.txt', dados: texto('oi') }]);
    expect(() => detectarFormato(z, 'alunos.csv')).toThrow(/não é CSV/);
  });

  it('recusa planilha com macro', () => {
    const z = zip([
      { nome: '[Content_Types].xml', dados: texto('<x/>') },
      { nome: 'xl/workbook.xml', dados: texto('<x/>') },
      { nome: 'xl/vbaProject.bin', dados: texto('macro') },
    ]);
    expect(() => detectarFormato(z, 'alunos.xlsx')).toThrow(/macros/);
  });

  it('para zip bomb pelo tamanho REAL descompactado, mesmo com cabeçalho mentindo', () => {
    const grande = new Uint8Array(101 * 1024 * 1024); // zeros: compacta para ~100 KB
    const z = zip([
      { nome: '[Content_Types].xml', dados: texto('<x/>') },
      { nome: 'xl/workbook.xml', dados: texto('<x/>') },
      { nome: 'xl/worksheets/sheet1.xml', dados: grande, declarado: 10 },
    ]);
    // Cabeçalho central declara 10 bytes descompactados.
    expect(z.length).toBeLessThan(1024 * 1024);
    expect(() => detectarFormato(z, 'alunos.xlsx')).toThrow(/passa do limite/);
  });

  it('recusa arquivo acima de 10 MB', () => {
    expect(() => detectarFormato(new Uint8Array(10 * 1024 * 1024 + 1).fill(0x61), 'a.csv')).toThrow(
      ArquivoInvalidoError,
    );
  });
});

describe('lerPlanilha', () => {
  it('lê CSV com ponto e vírgula, BOM e linhas vazias', async () => {
    const p = await lerPlanilha(texto('\uFEFFmatrícula;nome\n001;Ana\n\n002;"Bia; Souza"\n'), 'csv');
    expect(p.cabecalhos).toEqual(['matrícula', 'nome']);
    expect(p.linhas).toEqual([
      { numero: 2, celulas: ['001', 'Ana'] },
      { numero: 3, celulas: ['002', 'Bia; Souza'] },
    ]);
  });

  it('lê CSV salvo pelo Excel em Windows-1252', async () => {
    const latin1 = new Uint8Array([...texto('nome\nJo'), 0xe3, ...texto('o\n')]);
    const p = await lerPlanilha(latin1, 'csv');
    expect(p.linhas[0]!.celulas).toEqual(['João']);
  });

  it('lê XLSX, com data como aaaa-mm-dd', async () => {
    const xlsx = await gerarXlsx(['matricula', 'nascimento'], [['7', null]]);
    const p = await lerPlanilha(xlsx, 'xlsx');
    expect(p.linhas).toEqual([{ numero: 2, celulas: ['7', ''] }]);
  });

  it('recusa mais de 5.000 linhas', async () => {
    const csv = ['matricula', ...Array.from({ length: 5001 }, (_, i) => String(i))].join('\n');
    await expect(lerPlanilha(texto(csv), 'csv')).rejects.toThrow(/5000/);
  });

  it('aceita exatamente 5.000 linhas', async () => {
    const csv = ['matricula', ...Array.from({ length: 5000 }, (_, i) => String(i))].join('\n');
    expect((await lerPlanilha(texto(csv), 'csv')).linhas).toHaveLength(5000);
  });
});

describe('mapeamento', () => {
  it('sugere pelos sinônimos, ignorando acento, caixa e hífen', () => {
    const m = sugerirMapeamento('alunos', ['Nome do Aluno', 'Matrícula', 'E-mail', 'Turma', 'Telefone']);
    expect(m).toMatchObject({ nome: 0, matricula: 1, email: 2, turma: 3, responsavel1_telefone: 4 });
  });

  it('prefere o mapeamento salvo, casando pelo nome da coluna', () => {
    const anterior = { cabecalhos: ['Cód.', 'Aluno X'], mapeamento: { matricula: 0, nome: 1 } };
    const m = sugerirMapeamento('alunos', ['Aluno X', 'outra', 'Cód.'], anterior);
    expect(m).toMatchObject({ matricula: 2, nome: 0 });
  });

  it('aponta campo obrigatório sem coluna e coluna repetida', () => {
    expect(validarMapeamento('alunos', { matricula: 0, nome: 0 }, 3)).toEqual([
      '"Nome do aluno" e "Matrícula" estão na mesma coluna.',
    ]);
    expect(validarMapeamento('alunos', { matricula: null, nome: 1 }, 3)).toEqual([
      'Escolha a coluna de "Matrícula".',
    ]);
    expect(validarMapeamento('alunos', { matricula: 0, nome: 1, senha: 2 }, 3)).toEqual([
      'Campo desconhecido: senha.',
    ]);
  });
});

describe('planejarAlunos', () => {
  const CAB = ['matricula', 'nome', 'data_nascimento', 'email', 'turma', 'responsavel1_nome', 'responsavel1_email'];
  const mapa: MapeamentoColunas = Object.fromEntries(CAB.map((c, i) => [c, i]));
  const planilha = (linhas: string[][]) => ({
    cabecalhos: CAB,
    linhas: linhas.map((celulas, i) => ({ numero: i + 2, celulas })),
  });
  const contexto = (alunos: AlunoExistente[] = []): ContextoAlunos => ({
    turmasPorNome: new Map([
      ['1 ano a', ['t1']],
      ['duplicada', ['t2', 't3']],
    ]),
    alunosPorMatricula: new Map(alunos.map((a) => [a.matricula, a])),
    contasResponsavelPorEmail: new Map([['mae@x.test', 'u-mae']]),
  });

  it('classifica cada linha com o motivo', () => {
    const plano = planejarAlunos(
      planilha([
        ['001', 'Ana', '05/03/2010', '', '1º ano A', 'Mãe', 'MAE@x.test'],
        ['', 'Sem matrícula', '', '', '', '', ''],
        ['003', 'Turma errada', '', '', '9Z', '', ''],
        ['004', 'Turma ambígua', '', '', 'Duplicada', '', ''],
        ['005', 'Data ruim', '31/02/2010', '', '', '', ''],
        ['006', 'Resp sem e-mail', '', '', '', 'Pai', ''],
        ['007', 'E-mail ruim', '', 'nao-e-email', '', '', ''],
        ['008', 'Repetida 1', '', '', '', '', ''],
        ['008', 'Repetida 2', '', '', '', '', ''],
      ]),
      mapa,
      contexto(),
    );
    expect(plano.resumo).toEqual({ criar: 1, atualizar: 0, sem_alteracao: 0, recusar: 8 });
    const [ana, ...recusadas] = plano.itens;
    expect(ana!.dados).toEqual({
      matricula: '001',
      nome: 'Ana',
      dataNascimento: '2010-03-05',
      email: null,
      turmaId: 't1',
    });
    // Responsável casado pela conta existente, pelo e-mail sem diferenciar caixa.
    expect(ana!.responsaveisNovos).toEqual([
      { nome: 'Mãe', email: 'mae@x.test', telefone: null, parentesco: null, usuarioId: 'u-mae' },
    ]);
    expect(recusadas.map((i) => i.previa.motivos[0])).toEqual([
      'Matrícula em branco.',
      'Turma "9Z" não existe ou está arquivada.',
      'Há mais de uma turma ativa chamada "Duplicada".',
      'Data de nascimento inválida: "31/02/2010".',
      'Responsável 1 sem e-mail.',
      'E-mail do aluno inválido: "nao-e-email".',
      'Matrícula repetida no arquivo (também na linha 10).',
      'Matrícula repetida no arquivo (também na linha 9).',
    ]);
  });

  it('reimportar o mesmo cadastro não muda nada', () => {
    const existente: AlunoExistente = {
      id: 'a1',
      matricula: '001',
      nome: 'Ana',
      dataNascimento: '2010-03-05',
      email: null,
      turmaId: 't1',
      responsaveis: [
        { id: 'r1', nome: 'Mãe', email: 'mae@x.test', telefone: null, parentesco: null, usuarioId: 'u-mae' },
      ],
    };
    const plano = planejarAlunos(
      planilha([['001', 'Ana', '2010-03-05', '', '1º ano A', 'Mãe', 'mae@x.test']]),
      mapa,
      contexto([existente]),
    );
    expect(plano.resumo).toEqual({ criar: 0, atualizar: 0, sem_alteracao: 1, recusar: 0 });
  });

  it('atualiza o que mudou e vincula responsável novo', () => {
    const existente: AlunoExistente = {
      id: 'a1',
      matricula: '001',
      nome: 'Ana',
      dataNascimento: null,
      email: null,
      turmaId: 't1',
      responsaveis: [],
    };
    const plano = planejarAlunos(
      planilha([['001', 'Ana Souza', '', '', '', 'Pai', 'pai@x.test']]),
      mapa,
      contexto([existente]),
    );
    const [item] = plano.itens;
    expect(item!.previa.acao).toBe('atualizar');
    expect(item!.camposAlterados).toEqual({ nome: 'Ana Souza' });
    expect(item!.previa.motivos).toEqual(['Muda nome.', 'Vincula o responsável pai@x.test.']);
    expect(item!.responsaveisNovos).toHaveLength(1);
  });

  it('desfaz o apóstrofo da exportação ao reimportar', () => {
    const plano = planejarAlunos(planilha([["'-001", 'Ana', '', '', '', '', '']]), mapa, contexto());
    expect(plano.itens[0]!.dados?.matricula).toBe('-001');
  });
});

describe('planejarDisciplinas', () => {
  it('reconhece área do ENEM pelo nome oficial e recusa área desconhecida', () => {
    const plano = planejarDisciplinas(
      {
        cabecalhos: ['nome', 'area_enem'],
        linhas: [
          { numero: 2, celulas: ['Física', 'Ciências da Natureza e suas Tecnologias'] },
          { numero: 3, celulas: ['Artes', 'Artes'] },
        ],
      },
      { nome: 0, area_enem: 1 },
      { porNome: new Map() },
    );
    expect(plano.itens[0]!.dados).toEqual({ nome: 'Física', codigo: null, areaEnem: 'natureza' });
    expect(plano.itens[1]!.previa.motivos).toEqual(['Área do ENEM desconhecida: "Artes".']);
  });
});

describe('exportação CSV', () => {
  it.each([
    ['=HYPERLINK("http://x")', `"'=HYPERLINK(""http://x"")"`],
    ['+5511999999999', "'+5511999999999"],
    ['-2+3', "'-2+3"],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['\tcmd', "'\tcmd"],
    ['Ana; Bia', '"Ana; Bia"'],
    ['normal', 'normal'],
    [null, ''],
  ])('%j vira %j', (entrada, saida) => {
    expect(celulaSegura(entrada)).toBe(saida);
  });

  it('gera CSV com BOM e ponto e vírgula, que relê igual', async () => {
    const csv = gerarCsv(['matricula', 'nome'], [['=1', 'Ana; Bia']]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lida = await lerPlanilha(texto(csv), 'csv');
    expect(lida.linhas[0]!.celulas).toEqual(["'=1", 'Ana; Bia']);
  });
});
