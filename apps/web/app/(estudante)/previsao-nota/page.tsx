'use client';
import { useEffect, useState } from 'react';
import type { DashboardResponse } from '@notaa/contracts';
import { Carregando, Chip, Notice, PageHeader, Section, Skeleton, SummaryStrip } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Pagina } from '../../components/Pagina';
import { Voltar } from '../../components/Voltar';

const AREA_LABELS: Record<string, string> = {
  linguagens: 'Linguagens',
  matematica: 'Matemática',
  natureza: 'Natureza',
  humanas: 'Humanas',
};

const CURSO_LABEL: Record<string, string> = {
  medicina: 'Medicina',
  direito: 'Direito',
  engenharia: 'Engenharia',
  ti: 'Tecnologia / TI',
  psicologia: 'Psicologia',
  outro: 'Outro',
};

const SISU_MOCK_CUTOFFS: Record<string, number> = {
  medicina: 790,
  direito: 740,
  engenharia: 720,
  ti: 710,
  psicologia: 700,
  outro: 650,
};

export default function PrevisaoNotaPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const d = await apiFetch<DashboardResponse>('/me/dashboard');
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.code === 'NETWORK_ERROR') {
            setErro('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
          } else {
            setErro('Não foi possível carregar a previsão de nota. Tente recarregar a página.');
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
        <Notice tone="danger" title="Não foi possível abrir a previsão">
          {erro}
        </Notice>
      </Pagina>
    );
  }

  if (!data) return <PrevisaoSkeleton />;

  const { estimativaNota, perfil } = data;
  const objetivoKey = perfil.objetivoEnem || 'outro';
  const objetivoStr = CURSO_LABEL[objetivoKey] || perfil.objetivoEnem;
  const notaDeCorte = SISU_MOCK_CUTOFFS[objetivoKey] || 650;
  
  const diferenca = estimativaNota.geral - notaDeCorte;
  const chance = diferenca >= 0 ? 'Alta' : diferenca >= -50 ? 'Média' : 'Baixa';

  return (
    <Pagina>
      <div className="flex flex-col gap-space-3">
        <Voltar />
        <PageHeader title="Previsão de nota" description="Projeção do seu desempenho com base no modelo TRI do ENEM." />
      </div>

      <Section title="Média geral estimada">
        <div className="flex flex-col items-start gap-space-5 sm:flex-row sm:items-center sm:gap-space-7">
          <Gauge value={estimativaNota.geral} max={1000} />
          <div className="flex flex-col gap-space-3">
            {estimativaNota.naoCalibrado && <Chip tone="warning">Não calibrado</Chip>}
            <p className="m-0 max-w-texto text-body text-ink-muted">
              {estimativaNota.naoCalibrado
                ? 'Esta é uma estimativa linear provisória. O motor oficial da TRI está em fase de calibração.'
                : 'Sua nota geral calculada com os pesos padrão do ENEM.'}
            </p>
          </div>
        </div>
      </Section>

      <Section title="Desempenho por área" divided>
        <SummaryStrip
          aria-label="Nota estimada por área"
          items={Object.entries(estimativaNota.porArea).map(([area, nota]) => ({
            id: area,
            label: AREA_LABELS[area] || area,
            value: nota,
          }))}
        />
      </Section>

      <Section
        title="Simulador do SISU"
        description="Estimativa simplificada, com notas de corte de exemplo. Os cortes reais variam por universidade e modalidade de cota."
        divided
      >
        <div className="flex flex-wrap items-center gap-space-4">
          <Chip tone={chance === 'Alta' ? 'success' : chance === 'Média' ? 'warning' : 'danger'}>Chance {chance.toLowerCase()}</Chip>
          <p className="m-0 font-display text-heading-3 text-ink">Objetivo: {objetivoStr}</p>
        </div>
        <SummaryStrip
          aria-label="Sua nota frente à nota de corte"
          items={[
            { id: 'corte', label: 'Nota de corte estimada', value: notaDeCorte },
            { id: 'nota', label: 'Sua nota', value: estimativaNota.geral },
            {
              id: 'dif',
              label: 'Diferença',
              value: `${diferenca > 0 ? '+' : ''}${diferenca}`,
              hint: diferenca >= 0 ? 'Acima do corte' : 'Abaixo do corte',
            },
          ]}
        />
      </Section>
    </Pagina>
  );
}

// ─────────────────────────── Componentes Auxiliares ───────────────────────────

function Gauge({ value, max }: { value: number; max: number }) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const fraction = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative flex h-44 w-44 shrink-0 items-center justify-center">
      <svg viewBox="0 0 160 160" aria-hidden="true" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="10" className="stroke-surface-sunken" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - fraction)}
          className="text-primary [stroke:currentColor] transition-[stroke-dashoffset] duration-slow ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-display tabular-nums text-ink">{value}</span>
        <span className="text-caption text-ink-muted">de {max}</span>
      </div>
    </div>
  );
}

function PrevisaoSkeleton() {
  return (
    <Pagina>
      <Carregando rotulo="Carregando a previsão de nota" className="flex flex-col gap-space-6 md:gap-space-7">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-44 w-44 rounded-pill" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </Carregando>
    </Pagina>
  );
}
