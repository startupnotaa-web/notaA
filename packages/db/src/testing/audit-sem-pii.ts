import type { PGlite } from '@electric-sql/pglite';

// O audit_log é imutável: o que entra nele não sai mais. Este helper varre o que
// os fluxos de teste gravaram e devolve o que parece dado pessoal, para cada
// suíte de serviço provar que a trilha de auditoria só leva ids, nomes de campo
// e tipo de evento.

export const PII_EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
// Telefone brasileiro, sem casar com trechos de UUID (que vêm colados a letras e hífens).
export const PII_TELEFONE = /(?<![\w-])\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}(?![\w-])/;
export const CHAVES_PII = ['email', 'telefone', 'nome', 'antes', 'depois', 'matricula', 'usuarioId', 'token'];

/** Lista "acao: motivo" para cada linha do audit_log que parece conter dado pessoal. */
export async function acharPiiNoAuditLog(pg: PGlite): Promise<string[]> {
  const { rows } = await pg.query<{ acao: string; dados: Record<string, unknown> }>(
    'SELECT acao, dados FROM audit_log',
  );
  const achados: string[] = [];
  for (const { acao, dados } of rows) {
    const texto = JSON.stringify(dados);
    if (PII_EMAIL.test(texto)) achados.push(`${acao}: e-mail em ${texto}`);
    if (PII_TELEFONE.test(texto)) achados.push(`${acao}: telefone em ${texto}`);
    for (const chave of CHAVES_PII) {
      if (chave in dados) achados.push(`${acao}: chave proibida "${chave}"`);
    }
  }
  return achados;
}
