import { apiFetch } from './api-client';
import { supabaseBrowser } from './supabase-browser';

/**
 * Roda depois de QUALQUER sessão nova (signUp com confirmação automática OU
 * login pós-confirmação de e-mail) — garante que `usuario` existe e que
 * `app_metadata.papel` está setado (doc 05 §2). Idempotente no backend, então
 * é seguro chamar em todo login, não só no primeiro.
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
export async function garantirRegistro(): Promise<void> {
  const { data } = await supabaseBrowser.auth.getSession();
  const user = data.session?.user;
  const tipoPerfil = user?.user_metadata?.tipoPerfil;
  const nome = user?.user_metadata?.nome;
  const nomeInstituicao = user?.user_metadata?.nomeInstituicao;
  const tokenConviteProfessor = user?.user_metadata?.tokenConviteProfessor;
  if (!user?.email) return;

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
  } catch (error) {
    // A falha na sincronização não deve impedir o usuário de navegar caso o banco 
    // principal esteja instável. O fluxo de auth local continua funcionando.
    console.error('Falha ao garantir o registro do usuário na API:', error);
  }
}
