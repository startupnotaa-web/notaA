'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AnoLetivo, Turma } from '@notaa/contracts';
import { apiFetch } from './api-client';
import { CONTEXTO_STORAGE_KEY } from './storage-keys';

/**
 * Contexto de trabalho de quem administra: o ano letivo e a turma escolhidos na barra superior.
 * As telas leem daqui (lista de alunos, configuração acadêmica) em vez de cada uma ter o seu seletor.
 * Se a API recusar a lista (papel sem acesso a /turma, por exemplo), o seletor simplesmente não aparece.
 */
interface ContextoDoPainel {
  anos: AnoLetivo[];
  turmas: Turma[];
  /** Vazio enquanto não há ano letivo. */
  anoLetivoId: string;
  /** Vazio = todas as turmas. */
  turmaId: string;
  escolherAno: (id: string) => void;
  escolherTurma: (id: string) => void;
}

const Contexto = createContext<ContextoDoPainel | null>(null);

function lerSalvo(): { anoLetivoId?: string; turmaId?: string } {
  try {
    const bruto = localStorage.getItem(CONTEXTO_STORAGE_KEY);
    return bruto ? (JSON.parse(bruto) as { anoLetivoId?: string; turmaId?: string }) : {};
  } catch {
    return {};
  }
}

export function ContextoDoPainelProvider({ children }: { children: ReactNode }) {
  const [anos, setAnos] = useState<AnoLetivo[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [anoLetivoId, setAnoLetivoId] = useState('');
  const [turmaId, setTurmaId] = useState('');

  useEffect(() => {
    let cancelado = false;
    const salvo = lerSalvo();
    void Promise.all([
      apiFetch<AnoLetivo[]>('/ano-letivo').catch(() => [] as AnoLetivo[]),
      apiFetch<Turma[]>('/turma').catch(() => [] as Turma[]),
    ]).then(([listaAnos, listaTurmas]) => {
      if (cancelado) return;
      const anosOk = Array.isArray(listaAnos) ? listaAnos : [];
      const turmasOk = Array.isArray(listaTurmas) ? listaTurmas : [];
      setAnos(anosOk);
      setTurmas(turmasOk);
      const aberto = [...anosOk].reverse().find((a) => !a.arquivado) ?? anosOk.at(-1);
      setAnoLetivoId(salvo.anoLetivoId && anosOk.some((a) => a.id === salvo.anoLetivoId) ? salvo.anoLetivoId : (aberto?.id ?? ''));
      setTurmaId(salvo.turmaId && turmasOk.some((t) => t.id === salvo.turmaId) ? salvo.turmaId : '');
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const guardar = useCallback((ano: string, turma: string) => {
    try {
      localStorage.setItem(CONTEXTO_STORAGE_KEY, JSON.stringify({ anoLetivoId: ano, turmaId: turma }));
    } catch {
      // Sem armazenamento a escolha vale só nesta visita.
    }
  }, []);

  const valor = useMemo<ContextoDoPainel>(
    () => ({
      anos,
      turmas,
      anoLetivoId,
      turmaId,
      escolherAno: (id) => {
        setAnoLetivoId(id);
        // A turma escolhida pode não pertencer ao ano novo.
        const continua = turmas.some((t) => t.id === turmaId && t.anoLetivo.id === id);
        const novaTurma = continua ? turmaId : '';
        setTurmaId(novaTurma);
        guardar(id, novaTurma);
      },
      escolherTurma: (id) => {
        setTurmaId(id);
        guardar(anoLetivoId, id);
      },
    }),
    [anos, turmas, anoLetivoId, turmaId, guardar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Fora do provider devolve um contexto vazio: as telas funcionam com os próprios filtros. */
export function useContextoDoPainel(): ContextoDoPainel {
  return (
    useContext(Contexto) ?? {
      anos: [],
      turmas: [],
      anoLetivoId: '',
      turmaId: '',
      escolherAno: () => {},
      escolherTurma: () => {},
    }
  );
}
