import { inflateRawSync } from 'node:zlib';
import { LIMITE_IMPORTACAO_BYTES, type FormatoPlanilha } from '@notaa/contracts';

/** Arquivo recusado antes de qualquer leitura de conteúdo. A mensagem vai para a tela. */
export class ArquivoInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArquivoInvalidoError';
  }
}

/** Teto do XLSX descompactado. Planilha de 5.000 linhas fica bem abaixo disso. */
const LIMITE_DESCOMPACTADO = 100 * 1024 * 1024;
const LIMITE_ENTRADAS_ZIP = 2000;

const ASSINATURAS_BINARIAS: [string, number[]][] = [
  ['PDF', [0x25, 0x50, 0x44, 0x46]],
  ['executável', [0x4d, 0x5a]],
  ['executável', [0x7f, 0x45, 0x4c, 0x46]],
  ['planilha .xls antiga', [0xd0, 0xcf, 0x11, 0xe0]],
  ['imagem', [0x89, 0x50, 0x4e, 0x47]],
  ['imagem', [0xff, 0xd8, 0xff]],
  ['imagem', [0x47, 0x49, 0x46, 0x38]],
  ['arquivo compactado', [0x1f, 0x8b]],
  ['arquivo compactado', [0x52, 0x61, 0x72, 0x21]],
  ['arquivo compactado', [0x37, 0x7a, 0xbc, 0xaf]],
];

function comecaCom(bytes: Uint8Array, assinatura: number[]): boolean {
  return assinatura.every((b, i) => bytes[i] === b);
}

function u16(b: Uint8Array, o: number): number {
  return b[o]! | (b[o + 1]! << 8);
}
function u32(b: Uint8Array, o: number): number {
  return (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16)) + b[o + 3]! * 0x1000000;
}

/**
 * Confere que o ZIP é de fato uma pasta de trabalho do Excel e DESCOMPACTA
 * cada entrada com teto de saída. O tamanho declarado no cabeçalho do ZIP pode
 * mentir; o `maxOutputLength` do zlib não. Assim um zip bomb para aqui, antes
 * de o leitor de planilha alocar gigabytes.
 */
function validarXlsx(bytes: Uint8Array): void {
  const fim = Math.max(0, bytes.length - 65_557);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= fim; i--) {
    if (u32(bytes, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ArquivoInvalidoError('O arquivo .xlsx está corrompido.');

  const totalEntradas = u16(bytes, eocd + 10);
  let p = u32(bytes, eocd + 16);
  if (totalEntradas > LIMITE_ENTRADAS_ZIP || p >= bytes.length) {
    throw new ArquivoInvalidoError('O arquivo .xlsx está corrompido.');
  }

  const nomes = new Set<string>();
  let orcamento = LIMITE_DESCOMPACTADO;
  for (let n = 0; n < totalEntradas; n++) {
    if (p + 46 > bytes.length || u32(bytes, p) !== 0x02014b50) {
      throw new ArquivoInvalidoError('O arquivo .xlsx está corrompido.');
    }
    const flags = u16(bytes, p + 8);
    const metodo = u16(bytes, p + 10);
    const compactado = u32(bytes, p + 20);
    const tamNome = u16(bytes, p + 28);
    const tamExtra = u16(bytes, p + 30);
    const tamComentario = u16(bytes, p + 32);
    const local = u32(bytes, p + 42);
    const nome = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + tamNome));
    nomes.add(nome);

    if (flags & 0x1) throw new ArquivoInvalidoError('Planilha protegida por senha não é aceita.');
    if (compactado === 0xffffffff || local === 0xffffffff) {
      throw new ArquivoInvalidoError('O arquivo .xlsx é grande demais.');
    }
    if (metodo !== 0 && metodo !== 8) {
      throw new ArquivoInvalidoError('O arquivo .xlsx usa uma compactação não suportada.');
    }
    if (local + 30 > bytes.length || u32(bytes, local) !== 0x04034b50) {
      throw new ArquivoInvalidoError('O arquivo .xlsx está corrompido.');
    }
    const inicio = local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28);
    const dados = bytes.subarray(inicio, inicio + compactado);
    let tamanho: number;
    if (metodo === 0) {
      tamanho = dados.length;
    } else {
      try {
        tamanho = inflateRawSync(dados, { maxOutputLength: Math.max(1, orcamento) }).length;
      } catch {
        throw new ArquivoInvalidoError('O arquivo .xlsx descompactado passa do limite permitido.');
      }
    }
    orcamento -= tamanho;
    if (orcamento < 0) {
      throw new ArquivoInvalidoError('O arquivo .xlsx descompactado passa do limite permitido.');
    }
    p += 46 + tamNome + tamExtra + tamComentario;
  }

  if (!nomes.has('[Content_Types].xml') || !nomes.has('xl/workbook.xml')) {
    throw new ArquivoInvalidoError('O arquivo não é uma planilha do Excel (.xlsx).');
  }
  if (nomes.has('xl/vbaProject.bin')) {
    throw new ArquivoInvalidoError('Planilha com macros não é aceita. Salve como .xlsx comum.');
  }
}

/**
 * Decide o formato pelo CONTEÚDO, não pelo nome nem pelo Content-Type, que o
 * navegador preenche como quiser. A extensão só precisa concordar com o
 * conteúdo: um .xlsx que é texto, ou um .csv que é ZIP, é recusado.
 */
export function detectarFormato(bytes: Uint8Array, nomeArquivo: string): FormatoPlanilha {
  if (bytes.length === 0) throw new ArquivoInvalidoError('O arquivo está vazio.');
  if (bytes.length > LIMITE_IMPORTACAO_BYTES) {
    throw new ArquivoInvalidoError('O arquivo passa de 10 MB.');
  }
  const extensao = nomeArquivo.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv';

  if (comecaCom(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    if (extensao !== 'xlsx') {
      throw new ArquivoInvalidoError('O conteúdo do arquivo não é CSV. Confira a extensão.');
    }
    validarXlsx(bytes);
    return 'xlsx';
  }
  for (const [tipo, assinatura] of ASSINATURAS_BINARIAS) {
    if (comecaCom(bytes, assinatura)) {
      throw new ArquivoInvalidoError(`O arquivo é ${tipo}, não planilha. Envie .csv ou .xlsx.`);
    }
  }
  if (extensao === 'xlsx') {
    throw new ArquivoInvalidoError('O conteúdo do arquivo não é .xlsx. Confira a extensão.');
  }
  decodificarTexto(bytes);
  return 'csv';
}

/**
 * Texto do CSV. UTF-8 primeiro; se não for UTF-8 válido, Windows-1252, que é o
 * que o Excel em português salva como "CSV". Byte nulo ou caractere de
 * controle fora de tab/quebra de linha = não é texto.
 */
export function decodificarTexto(bytes: Uint8Array): string {
  let texto: string;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    texto = new TextDecoder('windows-1252').decode(bytes);
  }
  // eslint-disable-next-line no-control-regex -- procurar caractere de controle é o objetivo
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(texto)) {
    throw new ArquivoInvalidoError('O arquivo não é um CSV de texto.');
  }
  return texto.replace(/^\uFEFF/, '');
}
