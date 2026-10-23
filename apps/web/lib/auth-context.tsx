'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseBrowser } from './supabase-browser';
import { USER_STATE_STORAGE_KEY } from './storage-keys';
import { definirContextoAtivo, esquecerContextoSalvo } from './contexto-de-acesso';

interface AuthState {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Desativa e limpa Service Workers em ambiente de desenvolvimento para evitar cache indesejado
    if (process.env.NODE_ENV === 'development' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      }).catch(() => {
        // Falha ao desregistrar SW em dev — não-crítico, apenas ignora.
      });
    }

    supabaseBrowser.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    }).catch((err) => {
      console.error('Falha ao recuperar sessão do Supabase:', err);
      setLoading(false); // Libera o loading para não travar a UI infinitamente.
    });
    // O provedor só mantém a sessão. Para onde ir depois de entrar é decidido em UM lugar
    // (lib/entrada.ts, chamado pelo login, pelo retorno do Google e pelo "já estava logado"): navegar
    // daqui competia com essas telas e, como o SDK emite SIGNED_IN a cada vez que a aba volta a ter
    // foco, puxava a pessoa de volta para a home no meio do que ela fazia.
    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signOut() {
    // Remove o snapshot persistido do usuário (XP/nível/perfil) — evita que a
    // próxima conta logada neste navegador herde dados em cache da anterior.
    try {
      localStorage.removeItem(USER_STATE_STORAGE_KEY);
    } catch {
      // Storage indisponível — nada a limpar.
    }
    esquecerContextoSalvo();
    definirContextoAtivo(null);
    await supabaseBrowser.auth.signOut();
  }

  return <AuthContext.Provider value={{ session, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() precisa estar dentro de <AuthProvider>.');
  return ctx;
}
