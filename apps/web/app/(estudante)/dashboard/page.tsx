'use client';
// Dashboard Core (E4) — Hub de Estudos. Hidrata 100% a partir de GET /me/dashboard
// (doc 05 §5): perfil + estimativa de nota, nível/XP/streak (E9), Perfil Cognitivo
// 4D (E3) no radar e contadores de progresso (E7/E8). Nada de dado fixo: o que não
// tem sinal aparece como "aguardando sinal"; a nota vem marcada não-calibrada (Q-06).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardResponse, Eixo4D } from '@notaa/contracts';
import {
  Aurora,
  Button,
  ButtonLink,
  Carregando,
  Chip,
  Notice,
  PageHeader,
  ProgressTrail,
  Section,
  Skeleton,
  toast,
} from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Pagina } from '../../components/Pagina';

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
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function loadDashboard() {
      try {
        const d = await apiFetch<DashboardResponse>('/me/dashboard');
        if (!cancelled) setDashboard(d);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError) {
          if (e.status === 401) {
            // Redirecionamento para o login já está em andamento pelo api-client.
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

    window.addEventListener('focus', loadDashboard);

    return () => { 
      cancelled = true; 
      window.removeEventListener('focus', loadDashboard);
    };
  }, []);

  // Conquistas desbloqueadas em outras telas avisam por este evento; o aviso usa o Toast do sistema.
  useEffect(() => {
    const handleToast = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.msg) toast(`Nova conquista: ${detail.msg}`, { variant: 'success' });
    };
    window.addEventListener('toast-gamificacao', handleToast);
    return () => window.removeEventListener('toast-gamificacao', handleToast);
  }, []);

  if (erro) {
    return (
      <Pagina>
        <Notice tone="danger" title="Não foi possível carregar o seu painel">
          {erro}
        </Notice>
      </Pagina>
    );
  }

  if (!dashboard) return <DashboardSkeleton />;

  const { perfil, nivel, xpTotal, streak, perfilCognitivo4d } = dashboard;
  const objetivo = perfil.objetivoEnem
    ? (CURSO_LABEL[perfil.objetivoEnem] ?? perfil.objetivoEnem)
    : null;

  // Faltou um dia inteiro: a ofensiva ainda pode ser recuperada com a missão.
  const podeRecuperar =
    streak.ultimaAtividade &&
    Math.round(
      (new Date().setHours(0, 0, 0, 0) - new Date(`${streak.ultimaAtividade}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000),
    ) === 2 &&
    streak.diasConsecutivos > 0;

  const ETAPAS = 5;
  const progresso = Math.max(0, Math.min(1, nivel.progresso));

  return (
    <Pagina>
      <PageHeader
        title={perfil.nome ? `Olá, ${perfil.nome}` : 'Bom te ver de volta'}
        description={objetivo ? `Foco: ${objetivo}` : undefined}
      />

      {podeRecuperar && (
        <Notice
          tone="warning"
          title="Missão de recuperação"
          action={
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await apiFetch('/me/recover-streak', { method: 'POST' });
                  window.location.reload();
                } catch {
                  setErro('Não foi possível recuperar a ofensiva. Tente de novo.');
                }
              }}
            >
              Recuperar ofensiva
            </Button>
          }
        >
          Estude mais 20 minutos hoje, no quiz ou no tutor socrático, para não perder o seu ritmo.
        </Notice>
      )}

      {/* O ponto de energia da marca nesta tela: a aurora e o losango de progresso. */}
      <Aurora className="rounded-lg">
        <div className="flex flex-col gap-space-5 p-space-5 md:p-space-6">
          <div className="flex flex-wrap items-end justify-between gap-x-space-5 gap-y-space-2">
            <div>
              <p className="m-0 text-label text-ink-muted">Nível {nivel.atual}</p>
              <p className="m-0 font-display text-heading-1 tabular-nums text-ink">{xpTotal.toLocaleString('pt-BR')} XP</p>
            </div>
            <p className="m-0 text-body-sm tabular-nums text-ink-muted">
              {nivel.xpNoNivel} de {nivel.xpParaProximoNivel} XP para o nível {nivel.atual + 1}
            </p>
          </div>
          <ProgressTrail
            total={ETAPAS}
            done={Math.floor(progresso * ETAPAS)}
            label="Progresso até o próximo nível"
            caption={`${Math.round(progresso * 100)}% do nível ${nivel.atual}`}
          />
        </div>
      </Aurora>

      <Section
        title="Mapa cognitivo 4D"
        description="Como você aprende. Cada eixo se revela conforme você pratica."
        divided
      >
        <div className="flex flex-col gap-space-6 sm:flex-row sm:items-center">
          <Radar eixos={perfilCognitivo4d.eixos} />
          <ul className="m-0 flex flex-1 list-none flex-col gap-space-5 p-0">
            {perfilCognitivo4d.eixos.map((e) => (
              <AxisRow key={e.chave} eixo={e} />
            ))}
            <li className="text-body-sm text-ink-muted">
              Confiança da inferência: <strong className="text-ink">{Math.round(perfilCognitivo4d.confianca * 100)}%</strong>.
              Só mostramos posição onde há sinal seu. Os demais eixos entram com novas fontes (detector de erro e tutor
              socrático).
            </li>
          </ul>
        </div>
      </Section>

      <Section
        title="Próximo passo"
        description="Siga as trilhas sugeridas pela IA ou escolha uma ferramenta prática no estudo."
        divided
      >
        <div>
          <ButtonLink as={Link} href="/estudo" variant="primary">
            Continuar estudando
          </ButtonLink>
        </div>
      </Section>
    </Pagina>
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
    <div className="h-44 w-44 shrink-0">
      <svg viewBox={`0 0 ${RADAR.size} ${RADAR.size}`} role="img" aria-label="Radar dos quatro eixos do perfil cognitivo" className="h-full w-full">
        {[0.25, 0.5, 0.75, 1].map((lvl) => (
          <polygon key={lvl} points={polyAt(lvl)} fill="none" className="stroke-line" strokeWidth="1" />
        ))}
        {ANGLES.map((_, i) => {
          const tip = radarPoint(i, 1);
          return (
            <line key={i} x1={RADAR.center} y1={RADAR.center} x2={tip.x} y2={tip.y} className="stroke-line" strokeWidth="1" />
          );
        })}
        <polygon
          points={valuePoly}
          className="text-primary [fill:currentColor] [stroke:currentColor]"
          fillOpacity={0.14}
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
              className={e.temSinal ? 'text-primary [fill:currentColor]' : 'fill-ink-muted'}
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
    <li className="flex flex-col gap-space-2">
      <div className="flex items-center justify-between text-label text-ink">
        <span>{eixo.poloA}</span>
        <span>{eixo.poloB}</span>
      </div>
      <div className="relative h-2 w-full rounded-pill bg-surface-sunken">
        {eixo.temSinal ? (
          <span
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-surface bg-primary"
            style={{ left: `${pct}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="text-body-sm">
        {eixo.temSinal && lado ? (
          <span className="text-ink-muted">
            Tende ao lado <strong className="text-ink">{lado}</strong>
          </span>
        ) : (
          <Chip tone="neutral">Aguardando sinal</Chip>
        )}
      </div>
    </li>
  );
}

// ─────────────────────────── Carregando ───────────────────────────

function DashboardSkeleton() {
  return (
    <Pagina>
      <Carregando rotulo="Carregando o seu painel" className="flex flex-col gap-space-6 md:gap-space-7">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-56 w-full" />
      </Carregando>
    </Pagina>
  );
}
