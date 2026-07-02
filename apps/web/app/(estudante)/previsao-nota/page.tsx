'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardResponse } from '@notaa/contracts';
import { Card, SectionHeader, Skeleton, Badge, cn, Button } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../../lib/api-client';

const AREA_LABELS: Record<string, string> = {
  linguagens: 'Linguagens',
  matematica: 'Matemática',
  natureza: 'Natureza',
  humanas: 'Humanas',
};

const AREA_EMOJIS: Record<string, string> = {
  linguagens: '📖',
  matematica: '📐',
  natureza: '🔬',
  humanas: '🌍',
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
            setErro('Sem conexão com o servidor.');
          } else {
            setErro('Erro ao carregar a Previsão de Nota.');
          }
        }
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  if (erro) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
        <p className="text-sm text-error">{erro}</p>
      </div>
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
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4">
      <header className="space-y-2">
        <Link href="/dashboard" className="text-sm font-semibold text-brand-primary hover:underline">
          &larr; Voltar ao Painel
        </Link>
        <h1 className="text-3xl font-bold text-text">Previsão de Nota</h1>
        <p className="text-text-muted">Projeção do seu desempenho com base no modelo TRI do ENEM.</p>
      </header>

      {/* Nota Geral Consolidada */}
      <Card className="flex flex-col items-center justify-center py-10 bg-surface-2/20 border-brand-primary/20">
         <h2 className="text-sm font-bold uppercase tracking-widest text-brand-primary mb-6">Média Geral Estimada</h2>
         <Gauge value={estimativaNota.geral} max={1000} naoCalibrado={estimativaNota.naoCalibrado} />
         <p className="mt-8 text-center text-sm text-text-muted max-w-md px-4">
           {estimativaNota.naoCalibrado 
             ? "Esta é uma estimativa linear provisória. O motor oficial da TRI está em fase de calibração." 
             : "Sua nota geral calculada com pesos padrão do ENEM."}
         </p>
      </Card>

      {/* Quebra por Áreas */}
      <section className="space-y-4">
        <SectionHeader title="Desempenho" accent="Por Área" as="h2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(estimativaNota.porArea).map(([area, nota]) => (
            <Card key={area} className="p-5 flex flex-col items-center text-center group transition-colors hover:border-brand-primary/40 hover:bg-surface-2">
              <span className="text-3xl mb-3" aria-hidden="true">{AREA_EMOJIS[area] || '🎯'}</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">{AREA_LABELS[area] || area}</h3>
              <div className="text-3xl font-extrabold text-text group-hover:text-brand-primary transition-colors">{nota}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Simulador SISU */}
      <section className="space-y-4">
        <SectionHeader title="Simulador" accent="SISU (Mock)" as="h2" />
        <Card className="overflow-hidden border-border bg-gradient-to-br from-surface to-surface-2/30">
           <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                 <Badge variant={chance === 'Alta' ? 'success' : chance === 'Média' ? 'warning' : 'danger'}>
                   Chance: {chance}
                 </Badge>
                 <h3 className="text-2xl font-bold text-text">Objetivo: {objetivoStr}</h3>
                 <p className="text-sm text-text-muted">Nota de Corte Estimada: <strong className="text-text">{notaDeCorte}</strong></p>
              </div>
              
              <div className="flex items-center gap-6">
                 <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Sua Nota</p>
                    <p className={cn("text-4xl font-extrabold", diferenca >= 0 ? "text-success" : "text-error")}>
                      {estimativaNota.geral}
                    </p>
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Diferença</p>
                    <p className={cn("text-2xl font-bold", diferenca >= 0 ? "text-success" : "text-error")}>
                      {diferenca > 0 ? '+' : ''}{diferenca}
                    </p>
                 </div>
              </div>
           </div>
           
           <div className="bg-surface-2 p-4 text-xs text-center text-text-muted border-t border-border/50">
             Os cortes do SISU variam por universidade e modalidade de cota. Este é um simulador simplificado (MVP).
           </div>
        </Card>
      </section>
    </div>
  );
}

// ─────────────────────────── Componentes Auxiliares ───────────────────────────

function Gauge({ value, max, naoCalibrado }: { value: number; max: number; naoCalibrado: boolean }) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const fraction = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative mx-auto flex h-48 w-48 shrink-0 items-center justify-center">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="12" className="stroke-surface-2" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - fraction)}
          className="text-brand-primary [stroke:currentColor] drop-shadow-[0_0_8px_rgba(38,153,233,0.6)] transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-extrabold text-text drop-shadow-sm">{value}</span>
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted mt-1">de {max}</span>
        {naoCalibrado && (
          <span className="mt-2 rounded-full bg-warning/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-warning">
            não calibrado
          </span>
        )}
      </div>
    </div>
  );
}

function PrevisaoSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
