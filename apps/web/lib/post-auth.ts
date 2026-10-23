import type { TipoPerfilPublico } from '@notaa/contracts';
import { apiFetch, ApiError } from './api-client';
import { papelConhecido } from './destino';
import { classificarFalhaDeRegistro, type ResultadoRegistro } from './registro';
import { supabaseBrowser } from './supabase-browser';

export type { MotivoDaFalha, ResultadoRegistro } from './registro';

/**
 * Roda depois de QUALQUER sessão nova (signUp com confirmação automática OU login pós-confirmação de
 * e-mail) — garante que `usuario` existe e que `app_metadata.papel` está setado (doc 05 §2).
 * Idempotente no backend; se o token já traz um papel conhecido, nem chama a API.
 *
 * DEVOLVE o resultado em vez de engolir o erro. Antes, uma falha aqui (a API recusando, o banco sem
 * uma coluna, um e-mail já usado) era só um `console.error`: a conta ficava sem `usuario` e sem papel
 * e a pessoa caía num painel que não era dela, sem saber por quê. Quem chama decide: seguir, ou levar à
 * tela "Concluir cadastro".
 *
 * Os campos vêm de `user_metadata` (gravados no signUp) porque, se o projeto exigir confirmação de
 * e-mail, o login acontece bem depois do formulário. O servidor valida tudo (só os 3 tipos públicos).
 * Caminhos, nesta ordem de precedência:
 *   1. `tokenConviteProfessor` — professor institucional entrando por convite da instituição. Papel e
 *      instituição vêm do token, no servidor.
 *   2. `tipoPerfil` — cadastro pelo formulário público (aluno, professor independente ou instituição).
 *   3. nenhum dos dois (login por Google, por exemplo) — NÃO cria como aluno às escondidas: devolve
 *      `sem-tipo` e a tela "Concluir cadastro" pergunta o que a pessoa é.
 */
// Uma execução por vez: a tela que disparou a sessão e quem reage a ela podem chamar isto quase juntos;
// sem compartilhar a promessa, cada um registrava por conta própria.
let emAndamento: Promise<ResultadoRegistro> | null = null;

export function garantirRegistro(): Promise<ResultadoRegistro> {
  if (!emAndamento) {
    emAndamento = registrar().finally(() => {
      emAndamento = null;
    });
  }
  return emAndamento;
}

function falha(e: unknown): ResultadoRegistro {
  const status = e instanceof ApiError ? e.status : 0;
  return { ok: false, motivo: classificarFalhaDeRegistro(status), status };
}

async function registrar(): Promise<ResultadoRegistro> {
  const { data } = await supabaseBrowser.auth.getSession();
  const user = data.session?.user;
  if (!user?.email) return { ok: false, motivo: 'sessao', status: 401 };
  if (papelConhecido(user.app_metadata?.papel)) return { ok: true };

  const tipoPerfil = user.user_metadata?.tipoPerfil;
  const nome = user.user_metadata?.nome;
  const nomeInstituicao = user.user_metadata?.nomeInstituicao;
  const tokenConviteProfessor = user.user_metadata?.tokenConviteProfessor;

  try {
    if (tokenConviteProfessor) {
      await apiFetch('/convite-professor/registrar', {
        method: 'POST',
        body: JSON.stringify({ nome: nome ?? user.email, email: user.email, token: tokenConviteProfessor }),
      });
    } else if (tipoPerfil) {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome ?? user.email,
          email: user.email,
          tipoPerfil,
          // Só vai no corpo quando existe: o schema recusa `nomeInstituicao` vazio.
          ...(tipoPerfil === 'instituicao' && nomeInstituicao ? { nomeInstituicao } : {}),
        }),
      });
    } else {
      return { ok: false, motivo: 'sem-tipo', status: 0 };
    }
    await supabaseBrowser.auth.refreshSession(); // pega o JWT novo, agora com app_metadata.papel
    return { ok: true };
  } catch (e) {
    console.error('Falha ao garantir o registro do usuário na API:', e instanceof ApiError ? `${e.status} ${e.code}` : e);
    return falha(e);
  }
}

/** Nome para o cadastro de quem não preencheu formulário: o que o provedor informou, ou o começo do e-mail. */
function nomeDaConta(user: { email?: string; user_metadata?: Record<string, unknown> }): string {
  const m = user.user_metadata ?? {};
  for (const candidato of [m.nome, m.full_name, m.name]) {
    if (typeof candidato === 'string' && candidato.trim()) return candidato.trim();
  }
  return (user.email ?? '').split('@')[0] || 'Usuário';
}

/**
 * Registra a conta como o tipo que a PESSOA escolheu na tela "Concluir cadastro". O servidor aceita só
 * os três tipos públicos e não deixa trocar o papel de uma conta que já existe.
 */
export async function registrarComo(tipoPerfil: TipoPerfilPublico, nomeInstituicao?: string): Promise<ResultadoRegistro> {
  const { data } = await supabaseBrowser.auth.getSession();
  const user = data.session?.user;
  if (!user?.email) return { ok: false, motivo: 'sessao', status: 401 };
  try {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nome: nomeDaConta(user),
        email: user.email,
        tipoPerfil,
        ...(tipoPerfil === 'instituicao' && nomeInstituicao ? { nomeInstituicao } : {}),
      }),
    });
    await supabaseBrowser.auth.refreshSession();
    return { ok: true };
  } catch (e) {
    console.error('Falha ao registrar a conta na API:', e instanceof ApiError ? `${e.status} ${e.code}` : e);
    return falha(e);
  }
}
