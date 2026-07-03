'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AchievementsResponse } from '@notaa/contracts';
import { Card, SectionHeader, Skeleton, Badge, cn, Button } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';

const BADGE_DICTIONARY: Record<string, { titulo: string, descricao: string, emoji: string }> = {
  'onboarding': { titulo: 'O Despertar', descricao: 'Você deu o primeiro passo e completou o seu perfil.', emoji: '🚀' },
  'primeira_redacao': { titulo: 'Mão na Massa', descricao: 'Você enviou sua primeira redação para correção.', emoji: '✍️' },
  'quiz_primeiro': { titulo: 'Curioso', descricao: 'Você respondeu sua primeira questão no Quiz.', emoji: '🎯' },
  'socratico_primeiro': { titulo: 'Aprendiz Filosófico', descricao: 'Você questionou o Tutor Socrático pela primeira vez.', emoji: '🏛️' },
  'simulado_primeiro': { titulo: 'Teste de Fogo', descricao: 'Você completou seu primeiro Simulado Adaptativo.', emoji: '📊' },
  'ofensiva_3': { titulo: 'Fogo Brando', descricao: 'Você estudou 3 dias consecutivos.', emoji: '🔥' },
  'ofensiva_7': { titulo: 'Em Chamas', descricao: 'Você estudou 7 dias consecutivos.', emoji: '☄️' },
  'redacao_900': { titulo: 'Mestre das Palavras', descricao: 'Você alcançou 900+ em uma redação.', emoji: '🏅' },
  'batalha_vencedor': { titulo: 'Gladiador', descricao: 'Você venceu o seu primeiro duelo no Modo Batalha.', emoji: '⚔️' },
  'primeiro_xp': { titulo: 'Primeiros Passos', descricao: 'Você ganhou o seu primeiro XP na plataforma.', emoji: '✨' },
  'xp_100': { titulo: 'Ganhando Ritmo', descricao: 'Você acumulou 100 XP.', emoji: '⚡' },
  'xp_500': { titulo: 'Dedicação', descricao: 'Você acumulou 500 XP.', emoji: '💎' },
  'streak_3_dias': { titulo: 'Fogo Brando', descricao: 'Você estudou 3 dias consecutivos.', emoji: '🔥' },
  'streak_7_dias': { titulo: 'Em Chamas', descricao: 'Você estudou 7 dias consecutivos.', emoji: '☄️' },
  'streak_15_dias': { titulo: 'Ofensiva de Ferro', descricao: 'Você estudou 15 dias consecutivos.', emoji: '🛡️' },
  'streak_30_dias': { titulo: 'Imparável', descricao: 'Você estudou 30 dias consecutivos.', emoji: '🏆' },
  'streak_60_dias': { titulo: 'Lenda em Formação', descricao: 'Você estudou 60 dias consecutivos.', emoji: '🌟' },
  'streak_120_dias': { titulo: 'Mestre da Constância', descricao: 'Você estudou 120 dias consecutivos.', emoji: '👑' },
  'streak_240_dias': { titulo: 'Lenda do NotaA', descricao: 'Você estudou 240 dias consecutivos.', emoji: '🏔️' },
};

function getBadgeInfo(codigo: string) {
  if (BADGE_DICTIONARY[codigo]) return BADGE_DICTIONARY[codigo];
  
  // Fallback for unknown codes
  return {
    titulo: codigo.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    descricao: 'Conquista secreta desbloqueada.',
    emoji: '🏆',
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
            setErro('Sem conexão com o servidor.');
          } else {
            setErro('Erro ao carregar as Conquistas.');
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

  if (!data) return <CertificadosSkeleton />;

  const { desbloqueadas, bloqueadas } = data;
  const total = desbloqueadas.length + bloqueadas.length;
  const pct = total > 0 ? Math.round((desbloqueadas.length / total) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <Link href="/dashboard" className="text-sm font-semibold text-brand-primary hover:underline">
            &larr; Voltar ao Painel
          </Link>
          <h1 className="text-3xl font-bold text-text">Certificados e Conquistas</h1>
          <p className="text-text-muted">A sua parede de troféus. Colecione medalhas pela sua jornada.</p>
        </div>
        
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-4 min-w-[200px]">
           <div className="flex justify-between text-sm">
             <span className="font-bold text-text">Progresso</span>
             <span className="text-brand-primary font-bold">{desbloqueadas.length} / {total}</span>
           </div>
           <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
             <div className="h-full bg-brand-primary transition-all" style={{ width: `${pct}%` }} />
           </div>
        </div>
      </header>

      {/* Seção: Desbloqueadas */}
      <section className="space-y-4">
        <SectionHeader title="Conquistas" accent="Desbloqueadas" as="h2" />
        
        {desbloqueadas.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {desbloqueadas.map(ach => {
              const info = getBadgeInfo(ach.codigo);
              const dataFormatada = ach.concedidoEm 
                ? new Date(ach.concedidoEm).toLocaleDateString('pt-BR') 
                : 'Hoje';

              return (
                <Card key={ach.codigo} className="relative overflow-hidden border-brand-primary/30 bg-surface-2 p-5 transition-transform hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(38,153,233,0.15)] group">
                   <div className="absolute -right-4 -top-4 text-7xl opacity-5 transition-transform group-hover:scale-110 pointer-events-none select-none">
                     {info.emoji}
                   </div>
                   
                   <div className="relative z-10 flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-primary/20 text-3xl shadow-[0_0_10px_rgba(38,153,233,0.3)]">
                        {info.emoji}
                      </div>
                      <div>
                        <h3 className="font-bold text-text leading-tight mb-1">{info.titulo}</h3>
                        <p className="text-xs text-text-muted leading-relaxed mb-3">{info.descricao}</p>
                        
                        <div className="flex flex-wrap items-center gap-2">
                           <Badge variant="success" className="text-[10px] uppercase tracking-wider py-0.5">
                             +{ach.xpAssociado} XP
                           </Badge>
                           <span className="text-[10px] text-text-muted">
                             Em {dataFormatada}
                           </span>
                        </div>
                      </div>
                   </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center bg-surface-2/30 border-dashed border-border">
             <span className="text-4xl block mb-3 opacity-50">🌱</span>
             <p className="text-text font-bold">Nenhuma conquista ainda.</p>
             <p className="text-sm text-text-muted mt-1">Continue estudando para desbloquear sua primeira medalha!</p>
          </Card>
        )}
      </section>

      {/* Seção: Bloqueadas */}
      {bloqueadas.length > 0 && (
        <section className="space-y-4 pt-4">
          <SectionHeader title="Próximos" accent="Objetivos" as="h2" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bloqueadas.map(ach => {
              const info = getBadgeInfo(ach.codigo);
              
              return (
                <Card key={ach.codigo} className="p-4 bg-surface-2/20 border-dashed border-border/50 opacity-60 transition-opacity hover:opacity-100 flex flex-col items-center text-center">
                   <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-3 text-2xl grayscale mb-3">
                     {info.emoji}
                   </div>
                   <h3 className="text-sm font-bold text-text-muted mb-1">{info.titulo}</h3>
                   <p className="text-[10px] text-text-muted mb-3 flex-1">{info.descricao}</p>
                   
                   <div className="flex items-center gap-1 text-[10px] font-bold text-brand-primary/70 bg-brand-primary/5 px-2 py-1 rounded-md">
                     <span>🔒</span>
                     <span>+{ach.xpAssociado} XP</span>
                   </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function CertificadosSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-16 w-48 rounded-xl" />
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
