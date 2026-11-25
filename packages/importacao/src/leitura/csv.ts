/**
 * Célula segura para abrir no Excel/Sheets. Texto que começa com `= + - @`
 * (ou tab/CR, que alguns leitores descartam antes de olhar o resto) é lido
 * como FÓRMULA — um nome de aluno "=HYPERLINK(...)" viraria link malicioso
 * na planilha de quem exportou (CSV injection, OWASP). O apóstrofo na frente
 * força texto. A importação tira esse apóstrofo de volta (`celula`).
 */
export function celulaSegura(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  let texto = String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[",;\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * CSV com separador `;` e BOM: é o que o Excel em português abre direto, com
 * acento certo e cada campo na sua coluna.
 */
export function gerarCsv(cabecalhos: string[], linhas: (string | number | null)[][]): string {
  const corpo = [cabecalhos, ...linhas].map((l) => l.map(celulaSegura).join(';')).join('\r\n');
  return `\uFEFF${corpo}\r\n`;
}
