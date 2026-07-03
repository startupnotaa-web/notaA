'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabaseBrowser } from './supabase-browser';
import { USER_STATE_STORAGE_KEY } from './storage-keys';

interface AuthState {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'SIGNED_IN' && newSession?.user) {
        // Redirecionamento dinâmico e Sincronização OAuth
        const papel = newSession.user.app_metadata?.papel;
        if (papel) {
          router.push('/dashboard');
        } else {
          // Precisamos garantir o registro (e gerar o papel via sync-oauth ou formulário)
          import('./post-auth').then(async ({ garantirRegistro }) => {
            try {
              await garantirRegistro();
            } catch (err) {
              console.error('Falha ao sincronizar OAuth:', err);
              // Fallback se a API estiver fora
            } finally {
              // Executa independentemente de sucesso ou falha na API
              router.push('/onboarding');
            }
          });
        }
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, [router]);

  async function signOut() {
    // Remove o snapshot persistido do usuário (XP/nível/perfil) — evita que a
    // próxima conta logada neste navegador herde dados em cache da anterior.
    try {
      localStorage.removeItem(USER_STATE_STORAGE_KEY);
    } catch {
      // Storage indisponível — nada a limpar.
    }
    await supabaseBrowser.auth.signOut();
  }

  return <AuthContext.Provider value={{ session, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() precisa estar dentro de <AuthProvider>.');
  return ctx;
}
