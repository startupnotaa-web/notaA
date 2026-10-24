'use client';

import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import type { StudyTrailResponse } from '@notaa/contracts';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Button, Carregando, EmptyState, Inset, Notice, PageHeader, Section, Skeleton } from '@notaa/ui';
import { Pagina } from '../../components/Pagina';

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
      setError(e instanceof ApiError ? e.message : 'Não foi possível gerar a trilha de estudos.');
    } finally {
      setLoading(false);
    }
  }

  // AppShell (TopBar + BottomNav) já vem do layout do grupo (estudante) —
  // renderizar aqui de novo duplicava a barra superior nesta rota.
  return (
    <Pagina>
      <PageHeader
        title="Sua trilha de estudos"
        description="Uma rota gerada pela IA, focada nos conceitos que você mais precisa revisar."
      />

      {loading ? (
        <Carregando rotulo="Analisando seus resultados recentes" className="flex flex-col gap-space-5">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </Carregando>
      ) : error ? (
        <Notice
          tone="danger"
          title="Não foi possível gerar a trilha"
          action={
            <Button variant="secondary" onClick={carregarTrilha}>
              Tentar de novo
            </Button>
          }
        >
          {error}
        </Notice>
      ) : trilha ? (
        <Section title={trilha.titulo} description={trilha.descricao}>
          <ol className="m-0 flex list-none flex-col p-0">
            {trilha.passos.map((passo, index) => (
              <li key={index} className="flex gap-space-4">
                <div className="flex flex-col items-center">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-pill bg-violet-tint font-display text-label tabular-nums text-primary"
                  >
                    {index + 1}
                  </span>
                  {index < trilha.passos.length - 1 ? <span aria-hidden="true" className="w-px flex-1 bg-line" /> : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-space-2 pb-space-6">
                  <h3 className="m-0 pt-1 font-display text-heading-3 text-ink">
                    <span className="sr-only">Passo {index + 1}: </span>
                    {passo.titulo}
                  </h3>
                  <p className="m-0 max-w-texto text-body text-ink-muted">{passo.descricao}</p>
                  {passo.dica && (
                    <Inset className="flex items-start gap-space-3 text-body-sm text-ink">
                      <Lightbulb aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-primary" />
                      <span>
                        <strong>Dica:</strong> {passo.dica}
                      </span>
                    </Inset>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : (
        <EmptyState
          title="Nenhuma trilha ainda"
          actions={
            <Button variant="primary" onClick={carregarTrilha}>
              Gerar trilha
            </Button>
          }
        >
          Gere uma trilha para ver, passo a passo, o que revisar primeiro.
        </EmptyState>
      )}
    </Pagina>
  );
}
