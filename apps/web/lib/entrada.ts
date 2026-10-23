import {
  type ContextoDeAcesso,
  type ContextoListado,
  type ContextosResponse,
  type Papel,
} from '@notaa/contracts';
import { apiFetch, ApiError } from './api-client';
import {
  definirContextoAtivo,
  EVENTO_CONTEXTO_ESCOLHIDO,
  lerContextoSalvo,
  ocorrenciaNaLista,
  salvarContexto,
} from './contexto-de-acesso';
import { HOME_POR_PAPEL, papelConhecido, resolverDestino } from './destino';
import { garantirRegistro, type MotivoDaFalha } from './post-auth';
import { supabaseBrowser } from './supabase-browser';

export type Entrada =
  /** Pode seguir direto para o destino. */
  | { tipo: 'ir'; destino: string }
  /** A conta tem mais de um acesso: mostrar "Entrar como…". */
  | {
      tipo: 'escolher';
      authUid: string;
      papel: Papel;
      contextos: ContextoListado[];
      /** O último acesso deste navegador, se ainda existir; vem marcado na lista. */
      lembrado: ContextoDeAcesso | null;
      destino: string;
    }
  /** O token não traz papel: o cadastro não terminou. O motivo diz o que a tela "Concluir cadastro" oferece. */
  | { tipo: 'sem-papel'; motivo: MotivoDaFalha }
  | { tipo: 'conta-inativa' };

export interface OpcoesDeEntrada {
  /** Primeira entrada de uma conta (Google, confirmação): o aluno novo passa pelo onboarding. */
  aposRegistro?: boolean;
  /** Já estava logado: entra direto no último acesso lembrado, sem perguntar de novo. */
  usarUltimo?: boolean;
}

/** Home do papel, ou `next` se for interno e permitido. O aluno que acabou de se registrar vai ao onboarding. */
function destinoDaEntrada(papel: Papel, next: string | null, aposRegistro: boolean): string {
  const destino = resolverDestino({ papel }, next);
  return aposRegistro && papel === 'estudante' && destino === HOME_POR_PAPEL.estudante ? '/onboarding' : destino;
}

/**
 * Tudo o que acontece entre "a sessão existe" e "para onde vou": garante o registro na API, lê o
 * papel do TOKEN (`app_metadata`, nunca `user_metadata`), pede ao servidor os acessos reais da conta e
 * decide entre seguir ou perguntar "Entrar como…".
 *
 * Único dono dessa decisão: o login por senha, o retorno do Google e "já estava logado" passam por
 * aqui, em vez de cada tela navegar por conta própria.
 */
export async function prepararEntrada(next: string | null, opcoes: OpcoesDeEntrada = {}): Promise<Entrada> {
  const registro = await garantirRegistro();
  const { data } = await supabaseBrowser.auth.getSession();
  const usuario = data.session?.user;
  const papel = papelConhecido(usuario?.app_metadata?.papel);
  if (!usuario || !papel) return { tipo: 'sem-papel', motivo: registro.ok ? 'indisponivel' : registro.motivo };

  const destino = destinoDaEntrada(papel, next, opcoes.aposRegistro ?? false);

  let contextos: ContextoListado[] = [];
  try {
    contextos = (await apiFetch<ContextosResponse>('/me/contextos')).contextos;
  } catch (e) {
    if (e instanceof ApiError && e.code === 'CONTA_INATIVA') return { tipo: 'conta-inativa' };
    // A lista falhou, mas o papel é do token e a autorização é do servidor: entra no acesso padrão.
  }

  if (contextos.length <= 1) {
    definirContextoAtivo(null);
    return { tipo: 'ir', destino };
  }

  const lembrado = ocorrenciaNaLista(contextos, lerContextoSalvo(usuario.id));
  if (opcoes.usarUltimo && lembrado) {
    definirContextoAtivo(lembrado);
    return { tipo: 'ir', destino };
  }
  return { tipo: 'escolher', authUid: usuario.id, papel, contextos, lembrado, destino };
}

/**
 * Confirma no servidor (e na auditoria, só com ids) o acesso escolhido e passa a usá-lo. Falha se o
 * servidor recusar: não se entra num contexto que a API não reconhece.
 */
export async function confirmarContexto(
  authUid: string,
  contexto: ContextoDeAcesso,
  todos: readonly ContextoListado[],
): Promise<void> {
  await apiFetch('/me/contexto', { method: 'POST', body: JSON.stringify(contexto) });
  definirContextoAtivo(todos.length > 1 ? contexto : null);
  salvarContexto(authUid, contexto);
  window.dispatchEvent(new CustomEvent(EVENTO_CONTEXTO_ESCOLHIDO, { detail: contexto }));
}
