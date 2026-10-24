import { mesmoContexto, type ContextoDeAcesso } from '@notaa/contracts';
import { ACESSO_STORAGE_KEY } from './storage-keys';

/**
 * Contexto de acesso escolhido em "Entrar como…". Estado de módulo, e não de React, porque o
 * `apiFetch` precisa dele fora de qualquer componente. O servidor revalida a cada requisição: o que
 * está aqui é só o que a pessoa pediu, nunca uma permissão.
 */
let ativo: ContextoDeAcesso | null | undefined;

/**
 * Contexto a enviar no cabeçalho `x-contexto`. Null quando a conta tem um acesso só.
 *
 * Antes de o provedor carregar a lista (primeira pintura, recarga da página, aba nova), usa o último
 * acesso que ESTA conta escolheu neste navegador. Sem isso, as primeiras chamadas depois de um
 * recarregamento iam sem o cabeçalho, no acesso padrão, e as seguintes no escolhido: telas com dados
 * de duas instituições misturados. O servidor revalida: um acesso que não existe mais volta 403
 * CONTEXTO_INVALIDO e o provedor reage.
 */
export function contextoAtivo(authUid?: string): ContextoDeAcesso | null {
  if (ativo !== undefined) return ativo;
  return authUid ? lerContextoSalvo(authUid) : null;
}

export function definirContextoAtivo(contexto: ContextoDeAcesso | null): void {
  ativo = contexto;
}

/** Disparado quando uma escolha de "Entrar como…" é confirmada pelo servidor; o provedor atualiza o contexto atual. */
export const EVENTO_CONTEXTO_ESCOLHIDO = 'notaa:contexto-escolhido';

/** Evento disparado pelo `apiFetch` quando o servidor recusa o contexto ou a conta. */
export const EVENTO_ACESSO_RECUSADO = 'notaa:acesso-recusado';

/** Último contexto desta conta neste navegador, ou null. Outra conta no mesmo navegador não herda. */
export function lerContextoSalvo(authUid: string): ContextoDeAcesso | null {
  try {
    const bruto = localStorage.getItem(ACESSO_STORAGE_KEY);
    if (!bruto) return null;
    const salvo = JSON.parse(bruto) as { authUid?: string; contexto?: ContextoDeAcesso };
    if (salvo.authUid !== authUid || !salvo.contexto) return null;
    return salvo.contexto;
  } catch {
    return null;
  }
}

export function salvarContexto(authUid: string, contexto: ContextoDeAcesso): void {
  try {
    localStorage.setItem(ACESSO_STORAGE_KEY, JSON.stringify({ authUid, contexto }));
  } catch {
    // Storage indisponível: a escolha vale só nesta sessão.
  }
}

export function esquecerContextoSalvo(): void {
  try {
    localStorage.removeItem(ACESSO_STORAGE_KEY);
  } catch {
    // Nada a limpar.
  }
}

/** Acha na lista (que veio do servidor) o contexto que o navegador lembrou. */
export function ocorrenciaNaLista<T extends ContextoDeAcesso>(lista: readonly T[], lembrado: ContextoDeAcesso | null): T | null {
  return lembrado ? (lista.find((c) => mesmoContexto(c, lembrado)) ?? null) : null;
}
