'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { semRotulo, type ContextoDeAcesso, type ContextoListado, type ContextosResponse } from '@notaa/contracts';
import { apiFetch } from './api-client';
import { useAuth } from './auth-context';
import {
  definirContextoAtivo,
  esquecerContextoSalvo,
  EVENTO_ACESSO_RECUSADO,
  EVENTO_CONTEXTO_ESCOLHIDO,
  lerContextoSalvo,
  ocorrenciaNaLista,
} from './contexto-de-acesso';
import { homeDoPapel, papelConhecido } from './destino';
import { confirmarContexto } from './entrada';

interface ContextoDeAcessoState {
  /** Acessos reais da conta, vindos do servidor. Com 1 ou 0, o seletor não aparece. */
  contextos: ContextoListado[];
  atual: ContextoListado | null;
  /** Aviso para mostrar uma vez (ex.: o acesso escolhido deixou de existir). */
  aviso: string | null;
  trocando: boolean;
  erroDeTroca: string | null;
  trocar: (contexto: ContextoListado) => Promise<void>;
  dispensarAviso: () => void;
}

const Contexto = createContext<ContextoDeAcessoState | null>(null);

/**
 * Acessos da conta e o escolhido agora. Fica na raiz, dentro do AuthProvider. Busca a lista no
 * servidor quando há sessão com papel no token e a mantém sincronizada com o cabeçalho `x-contexto`
 * do `apiFetch`. Reage ao que o servidor recusa:
 *  - CONTEXTO_INVALIDO: o vínculo deixou de existir. Volta ao acesso padrão e avisa.
 *  - CONTA_INATIVA: sai da sessão e leva ao login com o motivo.
 */
export function ContextoDeAcessoProvider({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const authUid = session?.user.id ?? null;
  const papel = papelConhecido(session?.user.app_metadata?.papel);

  const [contextos, setContextos] = useState<ContextoListado[]>([]);
  const [atual, setAtual] = useState<ContextoListado | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trocando, setTrocando] = useState(false);
  const [erroDeTroca, setErroDeTroca] = useState<string | null>(null);

  const carregar = useCallback(async (uid: string): Promise<ContextoListado[]> => {
    try {
      const { contextos: lista } = await apiFetch<ContextosResponse>('/me/contextos');
      const escolhido = ocorrenciaNaLista(lista, lerContextoSalvo(uid)) ?? lista[0] ?? null;
      setContextos(lista);
      setAtual(escolhido);
      definirContextoAtivo(lista.length > 1 ? escolhido : null);
      return lista;
    } catch {
      // Sem lista não há seletor; a autorização continua sendo do servidor.
      setContextos([]);
      setAtual(null);
      definirContextoAtivo(null);
      return [];
    }
  }, []);

  useEffect(() => {
    if (!authUid) {
      setContextos([]);
      setAtual(null);
      definirContextoAtivo(null);
      return;
    }
    // Token sem papel (cadastro por terminar): ainda não há o que listar, e o que já estava escolhido fica.
    if (!papel) return;
    void carregar(authUid);
  }, [authUid, papel, carregar]);

  useEffect(() => {
    function aoRecusar(evento: Event) {
      const codigo = (evento as CustomEvent<string>).detail;
      if (codigo === 'CONTA_INATIVA') {
        void signOut().finally(() => window.location.assign('/login?motivo=conta-inativa'));
        return;
      }
      if (codigo === 'CONTEXTO_INVALIDO' && authUid) {
        esquecerContextoSalvo();
        definirContextoAtivo(null);
        void carregar(authUid).then(() => setAviso('Esse acesso não está mais disponível para a sua conta. Voltamos para o acesso padrão.'));
      }
    }
    window.addEventListener(EVENTO_ACESSO_RECUSADO, aoRecusar);
    return () => window.removeEventListener(EVENTO_ACESSO_RECUSADO, aoRecusar);
  }, [authUid, carregar, signOut]);

  // Uma escolha confirmada fora do provedor (a tela "Entrar como…") passa a ser o acesso atual.
  useEffect(() => {
    function aoEscolher(evento: Event) {
      const escolhido = (evento as CustomEvent<ContextoDeAcesso>).detail;
      setAtual((anterior) => ocorrenciaNaLista(contextos, escolhido) ?? anterior);
    }
    window.addEventListener(EVENTO_CONTEXTO_ESCOLHIDO, aoEscolher);
    return () => window.removeEventListener(EVENTO_CONTEXTO_ESCOLHIDO, aoEscolher);
  }, [contextos]);

  const trocar = useCallback(
    async (contexto: ContextoListado) => {
      if (!authUid || !papel) return;
      setTrocando(true);
      setErroDeTroca(null);
      try {
        await confirmarContexto(authUid, semRotulo(contexto), contextos);
        // Recarrega a tela inteira no acesso novo: nada do acesso anterior fica em memória.
        window.location.assign(homeDoPapel(papel));
      } catch {
        setErroDeTroca('Não foi possível trocar de acesso agora. Tente de novo.');
        setTrocando(false);
      }
    },
    [authUid, papel, contextos],
  );

  const valor = useMemo<ContextoDeAcessoState>(
    () => ({ contextos, atual, aviso, trocando, erroDeTroca, trocar, dispensarAviso: () => setAviso(null) }),
    [contextos, atual, aviso, trocando, erroDeTroca, trocar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useContextoDeAcesso(): ContextoDeAcessoState {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useContextoDeAcesso() precisa estar dentro de <ContextoDeAcessoProvider>.');
  return ctx;
}
