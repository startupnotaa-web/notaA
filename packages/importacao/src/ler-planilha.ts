import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { LIMITE_IMPORTACAO_LINHAS, type FormatoPlanilha } from '@notaa/contracts';
import { ArquivoInvalidoError, decodificarTexto } from './tipo-arquivo';

export interface Planilha {
  cabecalhos: string[];
  /** Linhas de dados (sem o cabeçalho), já como texto e sem linhas vazias. */
  linhas: { numero: number; celulas: string[] }[];
}

const LIMITE_COLUNAS = 60;

function data(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Valor de célula do Excel como texto, do jeito que a pessoa vê na planilha. */
function textoDaCelula(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return data(valor);
  if (typeof valor === 'object') {
    if ('richText' in valor) return valor.richText.map((r) => r.text).join('');
    if ('text' in valor) return String(valor.text);
    if ('result' in valor) return valor.result === undefined ? '' : textoDaCelula(valor.result as ExcelJS.CellValue);
    if ('error' in valor) return '';
    return '';
  }
  return String(valor);
}

function montar(matriz: string[][]): Planilha {
  const [cabecalhoBruto, ...resto] = matriz;
  if (!cabecalhoBruto || cabecalhoBruto.every((c) => c.trim() === '')) {
    throw new ArquivoInvalidoError('A planilha não tem cabeçalho na primeira linha.');
  }
  if (cabecalhoBruto.length > LIMITE_COLUNAS) {
    throw new ArquivoInvalidoError(`A planilha tem mais de ${LIMITE_COLUNAS} colunas.`);
  }
  const cabecalhos = cabecalhoBruto.map((c) => c.trim());
  const linhas = resto
    .map((celulas, i) => ({ numero: i + 2, celulas: celulas.map((c) => c.trim()) }))
    .filter((l) => l.celulas.some((c) => c !== ''));
  if (linhas.length > LIMITE_IMPORTACAO_LINHAS) {
    throw new ArquivoInvalidoError(
      `A planilha tem ${linhas.length} linhas. O limite é ${LIMITE_IMPORTACAO_LINHAS} por importação.`,
    );
  }
  if (linhas.length === 0) throw new ArquivoInvalidoError('A planilha não tem nenhuma linha de dados.');
  return { cabecalhos, linhas };
}

function lerCsv(bytes: Uint8Array): Planilha {
  const texto = decodificarTexto(bytes);
  // Papa detecta o separador: o Excel em português salva CSV com ";".
  const resultado = Papa.parse<string[]>(texto, { skipEmptyLines: 'greedy' });
  // Linhas de dados + cabeçalho; uma folga para o filtro de linha vazia.
  if (resultado.data.length > LIMITE_IMPORTACAO_LINHAS + 1) {
    throw new ArquivoInvalidoError(
      `A planilha tem mais de ${LIMITE_IMPORTACAO_LINHAS} linhas. Divida o arquivo.`,
    );
  }
  return montar(resultado.data.map((l) => l.map((c) => String(c ?? ''))));
}

async function lerXlsx(bytes: Uint8Array): Promise<Planilha> {
  const pasta = new ExcelJS.Workbook();
  try {
    await pasta.xlsx.load(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength) as never);
  } catch {
    throw new ArquivoInvalidoError('Não foi possível ler o arquivo .xlsx.');
  }
  const aba = pasta.worksheets[0];
  if (!aba) throw new ArquivoInvalidoError('A planilha não tem nenhuma aba.');
  // `rowCount` é a última linha declarada; uma célula perdida na linha um
  // milhão faria o laço abaixo percorrer um milhão de linhas vazias.
  if (aba.actualRowCount > LIMITE_IMPORTACAO_LINHAS + 1 || aba.rowCount > 4 * LIMITE_IMPORTACAO_LINHAS) {
    throw new ArquivoInvalidoError(
      `A planilha tem mais de ${LIMITE_IMPORTACAO_LINHAS} linhas. Divida o arquivo.`,
    );
  }
  const largura = Math.min(aba.actualColumnCount, LIMITE_COLUNAS + 1);
  const matriz: string[][] = [];
  for (let r = 1; r <= aba.rowCount; r++) {
    const linha = aba.getRow(r);
    const celulas: string[] = [];
    for (let c = 1; c <= largura; c++) celulas.push(textoDaCelula(linha.getCell(c).value));
    matriz.push(celulas);
  }
  return montar(matriz);
}

/** Lê a primeira aba (XLSX) ou o arquivo inteiro (CSV). O formato já foi conferido. */
export async function lerPlanilha(bytes: Uint8Array, formato: FormatoPlanilha): Promise<Planilha> {
  return formato === 'csv' ? lerCsv(bytes) : lerXlsx(bytes);
}

/** Gera um .xlsx de uma aba. Usado pelos testes e disponível para modelos. */
export async function gerarXlsx(cabecalhos: string[], linhas: (string | number | null)[][]): Promise<Uint8Array> {
  const pasta = new ExcelJS.Workbook();
  const aba = pasta.addWorksheet('Planilha');
  aba.addRow(cabecalhos);
  for (const l of linhas) aba.addRow(l);
  return new Uint8Array(await pasta.xlsx.writeBuffer());
}
