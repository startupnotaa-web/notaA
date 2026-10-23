import { apiFetch, ApiError } from './api-client';
import { classificarFalhaDeRegistro, type ResultadoRegistro } from './registro';
import { supabaseBrowser } from './supabase-browser';

export type { MotivoDaFalha, ResultadoRegistro } from './registro';

/**
 * Roda depois de QUALQUER sessão nova (signUp com confirmação automática OU
 * login pós-confirmação de e-mail) — garante que `usuario` existe e que
 * `app_metadata.papel` está setado (doc 05 §2). Idempotente no backend, então
 * é seguro chamar em todo login, não só no primeiro.
 *
 * DEVOLVE o resultado em vez de engolir o erro. Antes, uma falha aqui (a API
 * recusando, o banco sem uma coluna, um e-mail já usado) era só um
 * `console.error`: a conta ficava sem `usuario` e sem papel e a pessoa caía num
 * painel que não era dela, sem saber por quê. Quem chama decide o que fazer; os
 * chamadores de hoje seguem ignorando o valor e se comportam como antes.
 *
 * Os campos vêm de `user_metadata` (gravados no signUp) porque, se o projeto
 * exigir confirmação de e-mail, o login acontece bem depois do formulário — e a
 * essa altura nem o formulário nem a URL do convite existem mais.
 *
 * Três caminhos, nesta ordem de precedência:
 *   1. `tokenConviteProfessor` — professor institucional entrando por convite da
 *      instituição. Papel e instituição vêm do token, no servidor.
 *   2. `tipoPerfil` — cadastro pelo formulário público (aluno, professor
 *      independente ou instituição). `nomeInstituicao` acompanha o terceiro caso.
 *   3. nenhum dos dois — login por provedor externo, que cria como estudante.
 */
// Uma execução por vez. Depois da confirmação de e-mail, o AuthProvider (evento
// SIGNED_IN) e a tela que disparou a sessão chamam isto quase juntos; sem
// compartilhar a promessa, cada um registrava e navegava por conta própria, e o
// painel carregava com o token ainda sem `papel` (401 em /me).
let emAndamento: Promise<ResultadoRegistro> | null = null;

export function garantirRegistro(): Promise<ResultadoRegistro> {
  if (!emAndamento) {
    emAndamento = registrar().finally(() => {
      emAndamento = null;
    });
  }
  return emAndamento;
}

async function registrar(): Promise<ResultadoRegistro> {
  const { data } = await supabaseBrowser.auth.getSession();
  const user = data.session?.user;
  const tipoPerfil = user?.user_metadata?.tipoPerfil;
  const nome = user?.user_metadata?.nome;
  const nomeInstituicao = user?.user_metadata?.nomeInstituicao;
  const tokenConviteProfessor = user?.user_metadata?.tokenConviteProfessor;
  if (!user?.email) return { ok: false, motivo: 'sessao', status: 401 };

  try {
    if (tokenConviteProfessor) {
      // Professor institucional entrando por convite. Vem ANTES das outras
      // opções porque este caminho não tem `tipoPerfil` no user_metadata (o
      // papel não é escolhido pela pessoa, vem do convite) e cairia no
      // sync-oauth, que criaria a conta como estudante.
      await apiFetch('/convite-professor/registrar', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome ?? user.email,
          email: user.email,
          token: tokenConviteProfessor,
        }),
      });
    } else if (!tipoPerfil) {
      // Login via OAuth (Google, etc.) onde o formulário de cadastro foi pulado
      await apiFetch('/auth/sync-oauth', { method: 'POST', body: '{}' });
    } else {
      // Cadastro via formulário (Email/Senha) com perfil selecionado manualmente
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome ?? user.email,
          email: user.email,
          tipoPerfil,
          // Só vai no corpo quando existe: o schema recusa `nomeInstituicao` vazio e
          // estudante/professor não têm instituição para criar.
          ...(tipoPerfil === 'instituicao' && nomeInstituicao ? { nomeInstituicao } : {}),
        }),
      });
    }
    await supabaseBrowser.auth.refreshSession(); // pega o JWT novo, agora com app_metadata.papel
    return { ok: true };
  } catch (error) {
    // A falha na sincronização não impede o usuário de navegar caso o banco principal esteja
    // instável (o fluxo de auth local continua), mas agora quem chama pode saber que falhou.
    const status = error instanceof ApiError ? error.status : 0;
    console.error('Falha ao garantir o registro do usuário na API:', error instanceof ApiError ? `${status} ${error.code}` : error);
    return { ok: false, motivo: classificarFalhaDeRegistro(status), status };
  }
}
