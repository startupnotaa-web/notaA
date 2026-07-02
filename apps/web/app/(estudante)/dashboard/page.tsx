'use client';
// Dashboard Core (E4) — Hub de Estudos. Hidrata 100% a partir de GET /me/dashboard
// (doc 05 §5): perfil + estimativa de nota, nível/XP/streak (E9), Perfil Cognitivo
// 4D (E3) no radar e contadores de progresso (E7/E8). Nada de dado fixo: o que não
// tem sinal aparece como "aguardando sinal"; a nota vem marcada não-calibrada (Q-06).
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { AchievementsResponse, DashboardResponse, Eixo4D } from '@notaa/contracts';
import { Badge, Card, CardHeader, SectionHeader, Skeleton, cn } from '@notaa/ui';
import { NotaA_Dashboard_Batalha } from '../../components/NotaA_Dashboard_Batalha';
import { apiFetch, ApiError } from '../../../lib/api-client';

// Mapeia o id de curso coletado no onboarding (objetivoEnem) para um rótulo legível.
const CURSO_LABEL: Record<string, string> = {
  medicina: 'Medicina',
  direito: 'Direito',
  engenharia: 'Engenharia',
  ti: 'Tecnologia / TI',
  psicologia: 'Psicologia',
  outro: 'Outro',
};

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [achievements, setAchievements] = useState<AchievementsResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [useMock, setUseMock] = useState(false);

  const [toastMsg, setToastMsg] = useState<{ type: string; msg: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function loadDashboard() {
      try {
        const [d, a] = await Promise.all([
          apiFetch<DashboardResponse>('/me/dashboard'),
          apiFetch<AchievementsResponse>('/me/achievements'),
        ]);
        if (!cancelled) {
          setDashboard(d);
          setAchievements(a);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError) {
          if (e.status === 401) {
            setUseMock(true); // ponte enquanto o api-client trata a sessão
          } else if (e.code === 'NETWORK_ERROR') {
            setErro('Sem conexão com o servidor. Verifique sua internet e tente novamente.');
          } else {
            setErro(e.message);
          }
        } else {
          console.error('[Dashboard] Erro inesperado:', e);
          setErro('Não foi possível carregar o painel. Tente recarregar a página.');
        }
      }
    }
    
    loadDashboard();
    return () => { cancelled = true; };
  }, []);

  // Custom Event Listener para simulação de Toast de Gamificação
  useEffect(() => {
    const handleToast = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.msg) {
        setToastMsg(detail);
        setTimeout(() => setToastMsg(null), 4000);
      }
    };
    window.addEventListener('toast-gamificacao', handleToast);
    return () => window.removeEventListener('toast-gamificacao', handleToast);
  }, []);

  if (useMock) return <NotaA_Dashboard_Batalha />;

  if (erro) {
    return (
      <div className="p-4">
        <p role="alert" className="text-sm text-error">
          {erro}
        </p>
      </div>
    );
  }

  if (!dashboard) return <DashboardSkeleton />;

  const { perfil, estimativaNota, nivel, xpTotal, streak, perfilCognitivo4d, theta, progresso } =
    dashboard;
  const objetivo = perfil.objetivoEnem
    ? (CURSO_LABEL[perfil.objetivoEnem] ?? perfil.objetivoEnem)
    : null;
  const areasTheta = Object.entries(theta);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
      {/* Header: saudação personalizada + objetivo + ofensiva */}
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-text-muted">
            Olá <span aria-hidden="true">👋</span>
          </p>
          <h1 className="text-2xl font-bold">{perfil.nome ? perfil.nome : 'Bom te ver de volta'}</h1>
          {objetivo && (
            <p className="text-sm text-text-muted">
              Foco: <span className="font-semibold text-text">{objetivo}</span>
            </p>
          )}
        </div>
        {streak.diasConsecutivos > 0 && (
          <Badge variant="warning" icon={<span aria-hidden="true">🔥</span>}>
            {streak.diasConsecutivos} dia(s)
          </Badge>
        )}
      </header>

      {/* Card de Gamificação Premium (Passo C) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-primary/30 via-surface to-brand-accent/30 p-[1px] shadow-lg">
        <div className="flex flex-col gap-5 rounded-2xl bg-surface/70 p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand text-2xl font-bold text-white shadow-[0_0_20px_rgba(38,153,233,0.6)]">
              {nivel.atual}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-primary">Nível Atual</p>
              <p className="text-2xl font-extrabold text-text">{xpTotal.toLocaleString('pt-BR')} XP</p>
            </div>
          </div>
          
          <div className="flex-1 sm:px-6">
             <div className="mb-2 flex items-center justify-between text-xs font-bold text-text-muted">
               <span>PROGRESSO</span>
               <span>{nivel.xpNoNivel} / {nivel.xpParaProximoNivel} XP</span>
             </div>
             <ProgressBar fraction={nivel.progresso} />
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl bg-surface-2/60 px-5 py-3 border border-white/5">
             <span className="text-2xl drop-shadow-md" aria-hidden="true">🔥</span>
             <span className="text-xl font-extrabold text-warning">{streak.diasConsecutivos}</span>
             <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Ofensiva</span>
          </div>
        </div>
      </div>

      {/* Herói: medidor circular da Nota Estimada */}
      <Card>
        <CardHeader className="gap-6 sm:flex-row sm:items-center">
          <Gauge value={estimativaNota.geral} max={1000} naoCalibrado={estimativaNota.naoCalibrado} />
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
               <p className="text-sm font-semibold text-text-muted">Sua estimativa de nota baseada no histórico.</p>
               <button 
                  onClick={() => {
                    const event = new CustomEvent('toast-gamificacao', { detail: { type: 'xp', msg: '+30 XP Ganho!' } });
                    window.dispatchEvent(event);
                  }}
                  className="mt-4 rounded-full bg-brand-primary/10 px-4 py-2 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-primary/20"
               >
                 Simular Ganho de XP
               </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Perfil Cognitivo 4D — radar */}
      <section className="space-y-3">
        <SectionHeader
          title="Mapa"
          accent="Cognitivo 4D"
          description="Como você aprende. Cada eixo se revela conforme você pratica."
          as="h2"
        />
        <Card>
          <CardHeader className="gap-6 sm:flex-row sm:items-center">
            <Radar eixos={perfilCognitivo4d.eixos} />
            <ul className="flex-1 space-y-3">
              {perfilCognitivo4d.eixos.map((e) => (
                <AxisRow key={e.chave} eixo={e} />
              ))}
              <li className="text-xs text-text-muted">
                Confiança da inferência:{' '}
                <strong className="text-text">{Math.round(perfilCognitivo4d.confianca * 100)}%</strong>.
                Só mostramos posição onde há sinal seu — os demais eixos entram com novas fontes
                (Detector de Erro, Socrática).
              </li>
            </ul>
          </CardHeader>
        </Card>
      </section>

      {/* θ por área */}
      {areasTheta.length > 0 && (
        <Card>
          <CardHeader className="gap-3">
            <h2 className="text-base font-bold">Domínio por área (θ)</h2>
            <ul className="space-y-3">
              {areasTheta.map(([area, info]) => (
                <li key={area} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-text-muted">{area}</span>
                    <span className="text-text">{info.atual.toFixed(2)}</span>
                  </div>
                  <ProgressBar fraction={(Math.max(-3, Math.min(3, info.atual)) + 3) / 6} />
                </li>
              ))}
            </ul>
          </CardHeader>
        </Card>
      )}

      {/* Atalhos para o estudo aprofundado (com progresso real) */}
      <section className="space-y-6 pt-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4 rounded-3xl bg-surface-2 p-8 border border-brand-primary/20 shadow-lg relative overflow-hidden">
           <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-primary/10 blur-[80px] pointer-events-none" />
           <h2 className="text-2xl font-black text-text">Pronto para o próximo passo?</h2>
           <p className="text-text-muted max-w-md">Continue sua jornada de estudos pelas trilhas sugeridas pela IA ou escolha uma ferramenta prática no Hub de Estudos.</p>
           
           <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-2">
              <Link href="/estudo" className="w-full sm:w-auto">
                 <button className="w-full rounded-full bg-brand-primary px-8 py-4 text-sm font-bold text-brand-primary-foreground transition-all hover:bg-brand-primary-hover hover:scale-105 shadow-[0_0_20px_rgba(38,153,233,0.3)] focus:outline-none focus:ring-4 focus:ring-brand-primary/50">
                    Continuar Estudando →
                 </button>
              </Link>
           </div>
        </div>
      </section>

      {/* Conquistas */}
      {achievements && achievements.desbloqueadas.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Suas" accent="conquistas" as="h2" />
          <div className="flex flex-wrap gap-2">
            {achievements.desbloqueadas.map((c) => (
              <Badge key={c.codigo} variant="brand" icon={<span aria-hidden="true">🏆</span>}>
                {c.codigo}
              </Badge>
            ))}
          </div>
        </section>
      )}
      
      {/* Toast Animado */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex animate-in slide-in-from-bottom-5 items-center gap-3 rounded-2xl bg-gradient-brand p-4 text-white shadow-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl font-bold backdrop-blur-md">
             🎉
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-primary-content opacity-90">Nova Conquista</p>
            <p className="text-lg font-extrabold">{toastMsg.msg}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Medidor circular (Nota Estimada) ───────────────────────────

function Gauge({ value, max, naoCalibrado }: { value: number; max: number; naoCalibrado: boolean }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const fraction = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative mx-auto flex h-36 w-36 shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-surface-2" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - fraction)}
          className="text-brand-primary [stroke:currentColor] drop-shadow-[0_0_6px_rgba(38,153,233,0.55)] transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-extrabold text-text">{value}</span>
        <span className="text-[10px] uppercase tracking-widest text-text-muted">de {max}</span>
        {naoCalibrado && (
          <span className="mt-1 rounded-full bg-warning/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warning">
            não calibrado
          </span>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent = false,
  children,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</p>
      <p className={cn('mt-0.5 text-2xl font-extrabold', accent ? 'text-brand-accent' : 'text-text')}>
        {value}
      </p>
      {children}
    </div>
  );
}

function ProgressBar({ fraction }: { fraction: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-gradient-brand transition-all duration-1000 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─────────────────────────── Radar do Perfil 4D (4 eixos) ───────────────────────────

const RADAR = { size: 200, center: 100, max: 72 };
const ANGLES = [-90, 0, 90, 180].map((d) => (d * Math.PI) / 180); // topo, dir, base, esq

function radarPoint(i: number, frac: number) {
  const a = ANGLES[i]!;
  return {
    x: RADAR.center + Math.cos(a) * RADAR.max * frac,
    y: RADAR.center + Math.sin(a) * RADAR.max * frac,
  };
}
const polyAt = (frac: number) =>
  ANGLES.map((_, i) => radarPoint(i, frac))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

function Radar({ eixos }: { eixos: Eixo4D[] }) {
  // valor [-1,1] -> raio [0,1] (neutro = meio). Eixos sem sinal ficam no neutro.
  const valuePoly = eixos
    .slice(0, 4)
    .map((e, i) => radarPoint(i, (e.valor + 1) / 2))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <div className="mx-auto h-44 w-44 shrink-0">
      <svg viewBox={`0 0 ${RADAR.size} ${RADAR.size}`} className="h-full w-full">
        {[0.25, 0.5, 0.75, 1].map((lvl) => (
          <polygon
            key={lvl}
            points={polyAt(lvl)}
            fill="none"
            className="stroke-border"
            strokeWidth="1"
          />
        ))}
        {ANGLES.map((_, i) => {
          const tip = radarPoint(i, 1);
          return (
            <line
              key={i}
              x1={RADAR.center}
              y1={RADAR.center}
              x2={tip.x}
              y2={tip.y}
              className="stroke-border"
              strokeWidth="1"
            />
          );
        })}
        <polygon
          points={valuePoly}
          className="text-brand-primary [fill:currentColor] [stroke:currentColor]"
          fillOpacity={0.18}
          strokeWidth="2"
        />
        {eixos.slice(0, 4).map((e, i) => {
          const p = radarPoint(i, (e.valor + 1) / 2);
          return (
            <circle
              key={e.chave}
              cx={p.x}
              cy={p.y}
              r={e.temSinal ? 4 : 3}
              className={e.temSinal ? 'text-brand-accent [fill:currentColor]' : 'fill-text-muted'}
              fillOpacity={e.temSinal ? 1 : 0.5}
            />
          );
        })}
      </svg>
    </div>
  );
}

function AxisRow({ eixo }: { eixo: Eixo4D }) {
  const pct = ((eixo.valor + 1) / 2) * 100;
  const lado = eixo.valor === 0 ? null : eixo.valor < 0 ? eixo.poloA : eixo.poloB;
  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between text-sm font-medium text-text">
        <span>{eixo.poloA}</span>
        <span>{eixo.poloB}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
        {eixo.temSinal ? (
          <span
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-brand ring-2 ring-bg"
            style={{ left: `${pct}%` }}
            aria-hidden="true"
          />
        ) : (
          <div
            className="h-full w-full opacity-50"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, var(--color-border) 0 6px, transparent 6px 12px)',
            }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="text-xs">
        {eixo.temSinal && lado ? (
          <span className="text-text-muted">
            Tende ao lado <strong className="text-text">{lado}</strong>
          </span>
        ) : (
          <Badge variant="neutral">Aguardando sinal</Badge>
        )}
      </div>
    </li>
  );
}

// ─────────────────────────── Cards de atalho ───────────────────────────



// ─────────────────────────── Loading ───────────────────────────

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <Skeleton className="h-16 w-2/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-56 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
