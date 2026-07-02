'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { MeResponse } from '@notaa/contracts';
import { apiFetch } from './api-client';

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

function calcularNivelClient(xp: number): number {
  // Lógica client-side para recálculo otimista de nível (500 XP = 1 Nível)
  return Math.floor(xp / 500) + 1;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [estiloAprendizagem, setEstiloAprendizagem] = useState<string[] | null>(null);
  const [objetivo, setObjetivo] = useState<string | null>(null);

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
      console.error('Falha ao carregar perfil do usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPerfil();
  }, []);

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
