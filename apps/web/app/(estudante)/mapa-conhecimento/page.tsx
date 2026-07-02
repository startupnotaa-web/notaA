'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardResponse } from '@notaa/contracts';
import { Card, SectionHeader, Skeleton, cn, Button } from '@notaa/ui';
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
            setErro('Sem conexão com o servidor.');
          } else {
            setErro('Erro ao carregar o Mapa do Conhecimento.');
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

  if (!data) return <MapaSkeleton />;

  // Montar array de nós
  const areas = Object.entries(data).map(([key, info]) => {
    // normalizar theta de [-3, 3] para [0, 1]
    const normalized = (Math.max(-3, Math.min(3, info.atual)) + 3) / 6;
    let status: 'lacuna' | 'ok' | 'excelente' = 'ok';
    if (normalized < 0.4) status = 'lacuna';
    else if (normalized > 0.7) status = 'excelente';

    return {
      key,
      label: AREA_LABELS[key] || key,
      emoji: AREA_EMOJIS[key] || '🎯',
      theta: info.atual,
      normalized,
      status,
    };
  });

  const lacunas = areas.filter(a => a.status === 'lacuna');

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4">
      <header className="space-y-2">
        <Link href="/dashboard" className="text-sm font-semibold text-brand-primary hover:underline">
          &larr; Voltar ao Painel
        </Link>
        <h1 className="text-3xl font-bold text-text">Mapa do Conhecimento</h1>
        <p className="text-text-muted">Sua árvore de habilidades interativa. Visualize seu domínio por áreas.</p>
      </header>

      {/* Graph Area */}
      <Card className="overflow-hidden border-border bg-surface-2/30">
        <div className="relative flex min-h-[400px] flex-col items-center justify-center py-12">
           {/* SVG Lines - connecting center to 4 nodes at the bottom */}
           <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
             <path d="M50% 30% L20% 70%" className="stroke-border" strokeWidth="2" strokeDasharray="4 4" />
             <path d="M50% 30% L40% 70%" className="stroke-border" strokeWidth="2" strokeDasharray="4 4" />
             <path d="M50% 30% L60% 70%" className="stroke-border" strokeWidth="2" strokeDasharray="4 4" />
             <path d="M50% 30% L80% 70%" className="stroke-border" strokeWidth="2" strokeDasharray="4 4" />
           </svg>

           {/* Root Node */}
           <div className="relative z-10 mb-24 flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-brand-primary bg-surface shadow-xl">
             <span className="text-3xl" aria-hidden="true">🎓</span>
             <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-brand-primary">ENEM</span>
           </div>

           {/* Children Nodes */}
           <div className="relative z-10 flex w-full justify-between px-4 sm:px-12">
             {areas.map(area => (
               <SkillNode key={area.key} node={area} />
             ))}
           </div>
        </div>
      </Card>

      {/* Recommendations */}
      <section className="space-y-4">
        <SectionHeader title="Foco" accent="Recomendado" as="h2" />
        {lacunas.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {lacunas.map(lacuna => (
              <Card key={lacuna.key} className="flex flex-col gap-3 border-error/20 bg-error/5 p-5">
                 <div className="flex items-center gap-3">
                   <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-error/10 text-xl text-error">
                     {lacuna.emoji}
                   </div>
                   <div>
                     <h3 className="font-bold text-text">Lacuna em {lacuna.label}</h3>
                     <p className="text-xs text-text-muted">Proficiência atual: {Math.round(lacuna.normalized * 100)}%</p>
                   </div>
                 </div>
                 <Button asChild className="mt-2 w-full" variant="outline">
                   <Link href="/quiz">Praticar {lacuna.label}</Link>
                 </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-success/20 bg-success/5 p-6 text-center text-text-muted">
            <span className="mb-2 block text-3xl" aria-hidden="true">🚀</span>
            <p className="font-bold text-success">Você não possui lacunas críticas detectadas!</p>
            <p className="text-sm">Continue treinando no Simulado Adaptativo para buscar patamares de excelência.</p>
          </Card>
        )}
      </section>
    </div>
  );
}

function SkillNode({ node }: { node: any }) {
  let colorClass = 'border-border bg-surface-2 text-text-muted'; // Default
  let glowClass = '';

  if (node.status === 'lacuna') {
    colorClass = 'border-error bg-error/10 text-error';
    glowClass = 'shadow-[0_0_15px_rgba(239,68,68,0.3)]';
  } else if (node.status === 'excelente') {
    colorClass = 'border-success bg-success/10 text-success';
    glowClass = 'shadow-[0_0_15px_rgba(34,197,94,0.3)]';
  } else {
    colorClass = 'border-brand-primary bg-brand-primary/10 text-brand-primary';
  }

  const pct = Math.round(node.normalized * 100);

  return (
    <div className="group flex flex-col items-center gap-2">
      <div className={cn('flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-110', colorClass, glowClass)}>
        <span className="text-xl sm:text-2xl" aria-hidden="true">{node.emoji}</span>
      </div>
      <div className="text-center">
        <p className="hidden text-[10px] sm:block sm:text-xs font-bold text-text">{node.label}</p>
        <p className="sm:hidden text-[9px] font-bold text-text">{node.label.slice(0, 3)}.</p>
        <div className="mt-1 flex items-center justify-center gap-1">
          <div className="h-1.5 w-8 sm:w-12 overflow-hidden rounded-full bg-surface-3">
             <div className={cn("h-full rounded-full transition-all", node.status === 'lacuna' ? 'bg-error' : node.status === 'excelente' ? 'bg-success' : 'bg-brand-primary')} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MapaSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-[400px] w-full rounded-xl" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
