'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { MeResponse } from '@notaa/contracts';
import { apiFetch } from './api-client';
import { useAuth } from './auth-context';
import { USER_STATE_STORAGE_KEY } from './storage-keys';

interface UserState {
  perfil: MeResponse | null;
  loading: boolean;
  xp: number;
  level: number;
  streak: number;
  role: string | null;
  estiloAprendizagem: string[] | null;
  objetivo: string | null;
  addXP: (amount: number) => void;
  refreshPerfil: () => Promise<void>;
}

const UserContext = createContext<UserState | null>(null);

// Snapshot persistido em localStorage — restaura XP/nível/perfil instantaneamente
// ao recarregar ou voltar para a aba, em vez de resetar para o default enquanto
// o GET /me está em voo. `authUid` amarra o cache ao usuário logado: trocar de
// conta no mesmo navegador descarta o snapshot do usuário anterior.
interface PersistedUserState {
  authUid: string;
  perfil: MeResponse | null;
  xp: number;
  level: number;
  streak: number;
  role: string | null;
  estiloAprendizagem: string[] | null;
  objetivo: string | null;
}

function lerSnapshot(authUid: string): PersistedUserState | null {
  try {
    const raw = localStorage.getItem(USER_STATE_STORAGE_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as PersistedUserState;
    if (snapshot.authUid !== authUid) {
      localStorage.removeItem(USER_STATE_STORAGE_KEY);
      return null;
    }
    return snapshot;
  } catch {
    // Cache corrompido — descarta e segue para o fetch normal.
    try {
      localStorage.removeItem(USER_STATE_STORAGE_KEY);
    } catch {
      // localStorage indisponível (modo privado restrito) — persistência vira no-op.
    }
    return null;
  }
}

function calcularNivelClient(xp: number): number {
  // Lógica client-side para recálculo otimista de nível (500 XP = 1 Nível)
  return Math.floor(xp / 500) + 1;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const authUid = session?.user.id ?? null;

  const [perfil, setPerfil] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [estiloAprendizagem, setEstiloAprendizagem] = useState<string[] | null>(null);
  const [objetivo, setObjetivo] = useState<string | null>(null);
  // Só regrava o localStorage DEPOIS da hidratação inicial — senão o estado
  // default (xp=0) sobrescreveria o snapshot salvo antes de ele ser lido.
  const [hidratado, setHidratado] = useState(false);

  const carregarPerfil = async () => {
    try {
      const data = await apiFetch<MeResponse>('/me');
      setPerfil(data);
      if (data.gamificacao) {
        setXp(data.gamificacao.xpTotal);
        setLevel(data.gamificacao.nivel.atual);
        setStreak(data.gamificacao.ofensivaDias);
      }
      setRole(data.tipoPerfil);
      setEstiloAprendizagem(data.estiloAprendizagem || null);
      setObjetivo(data.objetivo || null);
    } catch (err) {
      // Com snapshot hidratado, o usuário segue vendo os dados da última sessão
      // em vez de um reset para zero.
      console.error('Falha ao carregar perfil do usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Hidratação roda só no cliente (useEffect) — sem mismatch com o HTML do SSR.
    if (authUid) {
      const snapshot = lerSnapshot(authUid);
      if (snapshot) {
        setPerfil(snapshot.perfil);
        setXp(snapshot.xp);
        setLevel(snapshot.level);
        setStreak(snapshot.streak);
        setRole(snapshot.role);
        setEstiloAprendizagem(snapshot.estiloAprendizagem);
        setObjetivo(snapshot.objetivo);
        setLoading(false); // dado em tela imediatamente; /me atualiza em background
      }
    }
    setHidratado(true);
    carregarPerfil();
  }, []);

  // Persiste qualquer mudança de estado (fetch do /me, addXP otimista) — o
  // snapshot fica sempre pronto para o próximo reload/troca de aba.
  useEffect(() => {
    if (!hidratado || !authUid) return;
    try {
      const snapshot: PersistedUserState = {
        authUid,
        perfil,
        xp,
        level,
        streak,
        role,
        estiloAprendizagem,
        objetivo,
      };
      localStorage.setItem(USER_STATE_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Quota cheia ou storage bloqueado — persistência é best-effort.
    }
  }, [hidratado, authUid, perfil, xp, level, streak, role, estiloAprendizagem, objetivo]);

  const addXP = (amount: number) => {
    setXp((prev) => {
      const novoXp = prev + amount;
      setLevel(calcularNivelClient(novoXp));
      return novoXp;
    });
  };

  return (
    <UserContext.Provider
      value={{
        perfil,
        loading,
        xp,
        level,
        streak,
        role,
        estiloAprendizagem,
        objetivo,
        addXP,
        refreshPerfil: carregarPerfil,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserState {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser() precisa estar dentro de <UserProvider>.');
  }
  return ctx;
}
