'use client';
import { useEffect, useState } from 'react';
import {
  ClipboardList,
  Crown,
  Flame,
  Gem,
  Landmark,
  Lock,
  Medal,
  Mountain,
  PenLine,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { AchievementsResponse } from '@notaa/contracts';
import { Carregando, Chip, EmptyState, Notice, PageHeader, Progress, Section, Skeleton } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Pagina } from '../../components/Pagina';
import { Voltar } from '../../components/Voltar';

const BADGE_DICTIONARY: Record<string, { titulo: string; descricao: string; Icone: LucideIcon }> = {
  'onboarding': { titulo: 'O despertar', descricao: 'Você deu o primeiro passo e completou o seu perfil.', Icone: Rocket },
  'primeira_redacao': { titulo: 'Mão na massa', descricao: 'Você enviou sua primeira redação para correção.', Icone: PenLine },
  'quiz_primeiro': { titulo: 'Curioso', descricao: 'Você respondeu sua primeira questão no quiz.', Icone: Target },
  'socratico_primeiro': { titulo: 'Aprendiz filosófico', descricao: 'Você questionou o tutor socrático pela primeira vez.', Icone: Landmark },
  'simulado_primeiro': { titulo: 'Teste de fogo', descricao: 'Você completou seu primeiro simulado adaptativo.', Icone: ClipboardList },
  'ofensiva_3': { titulo: 'Fogo brando', descricao: 'Você estudou 3 dias consecutivos.', Icone: Flame },
  'ofensiva_7': { titulo: 'Em chamas', descricao: 'Você estudou 7 dias consecutivos.', Icone: Flame },
  'redacao_900': { titulo: 'Mestre das palavras', descricao: 'Você alcançou 900 ou mais em uma redação.', Icone: Medal },
  'batalha_vencedor': { titulo: 'Gladiador', descricao: 'Você venceu o seu primeiro duelo no modo batalha.', Icone: Swords },
  'primeiro_xp': { titulo: 'Primeiros passos', descricao: 'Você ganhou o seu primeiro XP na plataforma.', Icone: Sparkles },
  'xp_100': { titulo: 'Ganhando ritmo', descricao: 'Você acumulou 100 XP.', Icone: Zap },
  'xp_500': { titulo: 'Dedicação', descricao: 'Você acumulou 500 XP.', Icone: Gem },
  'streak_3_dias': { titulo: 'Fogo brando', descricao: 'Você estudou 3 dias consecutivos.', Icone: Flame },
  'streak_7_dias': { titulo: 'Em chamas', descricao: 'Você estudou 7 dias consecutivos.', Icone: Flame },
  'streak_15_dias': { titulo: 'Ofensiva de ferro', descricao: 'Você estudou 15 dias consecutivos.', Icone: Shield },
  'streak_30_dias': { titulo: 'Imparável', descricao: 'Você estudou 30 dias consecutivos.', Icone: Trophy },
  'streak_60_dias': { titulo: 'Lenda em formação', descricao: 'Você estudou 60 dias consecutivos.', Icone: Star },
  'streak_120_dias': { titulo: 'Mestre da constância', descricao: 'Você estudou 120 dias consecutivos.', Icone: Crown },
  'streak_240_dias': { titulo: 'Lenda do Nota A', descricao: 'Você estudou 240 dias consecutivos.', Icone: Mountain },
};

function getBadgeInfo(codigo: string) {
  const conhecida = BADGE_DICTIONARY[codigo];
  if (conhecida) return conhecida;

  // Código desconhecido: monta um título legível a partir do próprio código.
  return {
    titulo: codigo.split('_').map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' '),
    descricao: 'Conquista secreta desbloqueada.',
    Icone: Trophy,
  };
}

export default function CertificadosPage() {
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const d = await apiFetch<AchievementsResponse>('/me/achievements');
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.code === 'NETWORK_ERROR') {
            setErro('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
          } else {
            setErro('Não foi possível carregar as conquistas. Tente recarregar a página.');
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
        <Notice tone="danger" title="Não foi possível abrir as conquistas">
          {erro}
        </Notice>
      </Pagina>
    );
  }

  if (!data) return <CertificadosSkeleton />;

  const { desbloqueadas, bloqueadas } = data;
  const total = desbloqueadas.length + bloqueadas.length;

  return (
    <Pagina>
      <div className="flex flex-col gap-space-3">
        <Voltar />
        <PageHeader title="Certificados e conquistas" description="Colecione medalhas pela sua jornada." />
      </div>

      <Progress value={desbloqueadas.length} max={Math.max(total, 1)} label={`${desbloqueadas.length} de ${total} conquistas`} />

      <Section title="Conquistas desbloqueadas">
        {desbloqueadas.length > 0 ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {desbloqueadas.map((ach) => {
              const { titulo, descricao, Icone } = getBadgeInfo(ach.codigo);
              const dataFormatada = ach.concedidoEm ? new Date(ach.concedidoEm).toLocaleDateString('pt-BR') : 'hoje';
              return (
                <li key={ach.codigo} className="flex items-start gap-space-4 border-b border-line py-space-4 first:pt-0 last:border-b-0 last:pb-0">
                  <span aria-hidden="true" className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-pill bg-violet-tint text-primary">
                    <Icone className="h-5 w-5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-space-1">
                    <h3 className="m-0 text-body font-bold text-ink">{titulo}</h3>
                    <p className="m-0 max-w-texto text-body-sm text-ink-muted">{descricao}</p>
                    <p className="m-0 flex flex-wrap items-center gap-space-2 text-caption text-ink-muted">
                      <Chip tone="success">+{ach.xpAssociado} XP</Chip>
                      Conquistada em {dataFormatada}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Nenhuma conquista ainda">Continue estudando para desbloquear a sua primeira medalha.</EmptyState>
        )}
      </Section>

      {bloqueadas.length > 0 && (
        <Section title="Próximos objetivos" divided>
          <ul className="m-0 flex list-none flex-col p-0">
            {bloqueadas.map((ach) => {
              const { titulo, descricao } = getBadgeInfo(ach.codigo);
              return (
                <li key={ach.codigo} className="flex items-start gap-space-4 border-b border-line py-space-4 first:pt-0 last:border-b-0 last:pb-0">
                  <span aria-hidden="true" className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-pill bg-surface-sunken text-ink-muted">
                    <Lock className="h-5 w-5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-space-1">
                    <h3 className="m-0 text-body font-bold text-ink">{titulo}</h3>
                    <p className="m-0 max-w-texto text-body-sm text-ink-muted">{descricao}</p>
                    <p className="m-0 flex flex-wrap items-center gap-space-2 text-caption text-ink-muted">
                      <Chip tone="neutral">Bloqueada</Chip>
                      Vale +{ach.xpAssociado} XP
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </Pagina>
  );
}

function CertificadosSkeleton() {
  return (
    <Pagina>
      <Carregando rotulo="Carregando as conquistas" className="flex flex-col gap-space-6 md:gap-space-7">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </Carregando>
    </Pagina>
  );
}
