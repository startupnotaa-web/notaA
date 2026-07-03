'use client';

import { useEffect, useState } from 'react';
import type { StudyTrailResponse } from '@notaa/contracts';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Button } from '@notaa/ui';

export default function TrilhasPage() {
  const [trilha, setTrilha] = useState<StudyTrailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarTrilha();
  }, []);

  async function carregarTrilha() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<StudyTrailResponse>('/study-trails/generate');
      setTrilha(data);
    } catch (e) {
      console.error(e);
      setError(e instanceof ApiError ? e.message : 'Erro ao gerar trilha de estudos.');
    } finally {
      setLoading(false);
    }
  }

  // AppShell (TopBar + BottomNav) já vem do layout do grupo (estudante) —
  // renderizar aqui de novo duplicava a barra superior nesta rota.
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-text">Sua Trilha de Estudos</h1>
      <p className="mb-8 text-text-muted">
        Uma rota personalizada gerada pela IA, focada nos conceitos que você mais precisa revisar.
      </p>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="mt-4 text-sm text-text-muted">Analisando seus resultados recentes...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-error/50 bg-error/10 p-6 text-center">
          <p className="text-error mb-4">{error}</p>
          <Button variant="primary" onClick={carregarTrilha}>
            Tentar Novamente
          </Button>
        </div>
      ) : trilha ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-brand/20 bg-brand/5 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-brand">{trilha.titulo}</h2>
            <p className="mt-2 text-text-muted">{trilha.descricao}</p>
          </div>

          <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-brand before:to-border">
            {trilha.passos.map((passo, index) => (
              <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-surface bg-brand text-surface shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <span className="font-bold">{index + 1}</span>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] rounded-xl border border-border bg-surface p-4 shadow-sm transition-all hover:border-brand/50">
                  <h3 className="mb-1 font-bold text-text">{passo.titulo}</h3>
                  <p className="text-sm text-text-muted">{passo.descricao}</p>
                  {passo.dica && (
                    <div className="mt-3 rounded-md bg-brand/10 p-2 text-xs text-brand">
                      💡 <strong>Dica:</strong> {passo.dica}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-text-muted">Nenhuma trilha encontrada.</p>
      )}
    </div>
  );
}
