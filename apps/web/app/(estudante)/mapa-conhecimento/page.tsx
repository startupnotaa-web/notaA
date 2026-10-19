'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardResponse } from '@notaa/contracts';
import { ActionRow, ButtonLink, Carregando, Chip, Notice, PageHeader, Progress, Section, Skeleton, type Tone } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Pagina } from '../../components/Pagina';
import { Voltar } from '../../components/Voltar';

const AREA_LABELS: Record<string, string> = {
  linguagens: 'Linguagens',
  matematica: 'Matemática',
  natureza: 'Natureza',
  humanas: 'Humanas',
};

type Situacao = 'lacuna' | 'ok' | 'excelente';

const SITUACAO: Record<Situacao, { texto: string; tom: Tone }> = {
  lacuna: { texto: 'Lacuna', tom: 'danger' },
  ok: { texto: 'Em bom caminho', tom: 'info' },
  excelente: { texto: 'Excelente', tom: 'success' },
};

export default function MapaConhecimentoPage() {
  const [data, setData] = useState<DashboardResponse['theta'] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const d = await apiFetch<DashboardResponse>('/me/dashboard');
        if (!cancelled) setData(d.theta);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.code === 'NETWORK_ERROR') {
            setErro('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
          } else {
            setErro('Não foi possível carregar o mapa do conhecimento. Tente recarregar a página.');
          }
        }
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  if (erro) {
    return (
      <Pagina>
        <Voltar />
        <Notice tone="danger" title="Não foi possível abrir o mapa">
          {erro}
        </Notice>
      </Pagina>
    );
  }

  if (!data) return <MapaSkeleton />;

  const areas = Object.entries(data).map(([key, info]) => {
    // normalizar theta de [-3, 3] para [0, 1]
    const normalized = (Math.max(-3, Math.min(3, info.atual)) + 3) / 6;
    let status: Situacao = 'ok';
    if (normalized < 0.4) status = 'lacuna';
    else if (normalized > 0.7) status = 'excelente';

    return {
      key,
      label: AREA_LABELS[key] || key,
      normalized,
      pct: Math.round(normalized * 100),
      status,
    };
  });

  const lacunas = areas.filter((a) => a.status === 'lacuna');

  return (
    <Pagina>
      <div className="flex flex-col gap-space-3">
        <Voltar />
        <PageHeader title="Mapa do conhecimento" description="Seu domínio em cada área do ENEM, a partir das questões que você já respondeu." />
      </div>

      <Section title="Seu domínio por área">
        {areas.length === 0 ? (
          <Notice tone="info" title="Ainda não há dados">
            Responda alguns quizzes ou um simulado para ver o seu domínio em cada área.
          </Notice>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-space-5 p-0">
            {areas.map((area) => (
              <li key={area.key} className="flex flex-col gap-space-2">
                <div className="flex flex-wrap items-center justify-between gap-space-2">
                  <span className="text-body font-bold text-ink">{area.label}</span>
                  <span className="flex items-center gap-space-3">
                    <span className="text-body-sm tabular-nums text-ink-muted">{area.pct}%</span>
                    <Chip tone={SITUACAO[area.status].tom}>{SITUACAO[area.status].texto}</Chip>
                  </span>
                </div>
                <Progress value={area.pct} max={100} aria-label={`Domínio em ${area.label}`} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Foco recomendado" divided>
        {lacunas.length > 0 ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {lacunas.map((lacuna) => (
              <ActionRow
                key={lacuna.key}
                status={<Chip tone="danger">Lacuna</Chip>}
                title={`Lacuna em ${lacuna.label}`}
                description={`Proficiência atual: ${lacuna.pct}%`}
                action={
                  <ButtonLink as={Link} href="/quiz" variant="secondary">
                    Praticar {lacuna.label}
                  </ButtonLink>
                }
              />
            ))}
          </ul>
        ) : (
          <Notice tone="success" title="Nenhuma lacuna crítica detectada">
            Continue treinando no simulado adaptativo para buscar patamares de excelência.
          </Notice>
        )}
      </Section>
    </Pagina>
  );
}

function MapaSkeleton() {
  return (
    <Pagina>
      <Carregando rotulo="Carregando o mapa do conhecimento" className="flex flex-col gap-space-6 md:gap-space-7">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-24 w-full" />
      </Carregando>
    </Pagina>
  );
}
