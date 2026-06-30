import { apiFetch } from './api-client';
import { supabaseBrowser } from './supabase-browser';

/**
 * Roda depois de QUALQUER sessão nova (signUp com confirmação automática OU
 * login pós-confirmação de e-mail) — garante que `usuario` existe e que
 * `app_metadata.papel` está setado (doc 05 §2). Idempotente no backend, então
 * é seguro chamar em todo login, não só no primeiro.
 *
 * `nome`/`tipoPerfil` vêm de `user_metadata` (gravados no signUp) porque, se o
 * projeto exigir confirmação de e-mail, o login acontece bem depois do
 * formulário de cadastro — não temos mais esses campos à mão nesse momento.
 */
export async function garantirRegistro(): Promise<void> {
  const { data } = await supabaseBrowser.auth.getSession();
  const user = data.session?.user;
  const tipoPerfil = user?.user_metadata?.tipoPerfil;
  const nome = user?.user_metadata?.nome;
  if (!user?.email) return;

  try {
    if (!tipoPerfil) {
      // Login via OAuth (Google, etc.) onde o formulário de cadastro foi pulado
      await apiFetch('/auth/sync-oauth', { method: 'POST', body: '{}' });
    } else {
      // Cadastro via formulário (Email/Senha) com perfil selecionado manualmente
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nome: nome ?? user.email, email: user.email, tipoPerfil }),
      });
    }
    await supabaseBrowser.auth.refreshSession(); // pega o JWT novo, agora com app_metadata.papel
  } catch (error) {
    // A falha na sincronização não deve impedir o usuário de navegar caso o banco 
    // principal esteja instável. O fluxo de auth local continua funcionando.
    console.error('Falha ao garantir o registro do usuário na API:', error);
  }
}
