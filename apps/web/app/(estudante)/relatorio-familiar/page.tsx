'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardResponse } from '@notaa/contracts';
import { Card, SectionHeader, Skeleton, Badge, cn, Button } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';

const AREA_LABELS: Record<string, string> = {
  linguagens: 'Linguagens',
  matematica: 'Matemática',
  natureza: 'Natureza',
  humanas: 'Humanas',
};

export default function RelatorioFamiliarPage() {
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
            setErro('Erro ao carregar o Relatório.');
          }
        }
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'Relatório Familiar - Nota A',
        text: `Confira o progresso de ${data?.perfil.nome || 'nosso estudante'} na plataforma!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      window.print();
    }
  };

  if (erro) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
        <p className="text-sm text-error">{erro}</p>
      </div>
    );
  }

  if (!data) return <RelatorioSkeleton />;

  const { perfil, streak, xpTotal, nivel, theta, progresso } = data;
  const atividadesExtras = progresso.redacoesEnviadas + progresso.sessoesSocraticas;
  const nomeAluno = perfil.nome || 'Estudante';

  // Encontrar o maior e o menor theta
  let melhorArea = '';
  let piorArea = '';
  let maxTheta = -Infinity;
  let minTheta = Infinity;

  Object.entries(theta).forEach(([key, info]) => {
    if (info.atual > maxTheta) {
      maxTheta = info.atual;
      melhorArea = key;
    }
    if (info.atual < minTheta) {
      minTheta = info.atual;
      piorArea = key;
    }
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-4">
      <header className="space-y-2 print:hidden">
        <Link href="/dashboard" className="text-sm font-semibold text-brand-primary hover:underline">
          &larr; Voltar ao Painel
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text">Relatório Familiar</h1>
            <p className="text-text-muted">Um resumo simples para compartilhar em casa.</p>
          </div>
          <Button onClick={handleShare} className="gap-2">
            <span>📤</span> Compartilhar
          </Button>
        </div>
      </header>

      {/* Cartão Compartilhável */}
      <Card id="relatorio-card" className="overflow-hidden border-brand-primary/20 bg-surface-2 p-0 shadow-lg print:shadow-none print:border-none print:bg-transparent">
        
        {/* Top Header do Card */}
        <div className="bg-brand-primary p-6 text-brand-primary-foreground text-center space-y-2">
           <h2 className="text-sm font-bold uppercase tracking-widest opacity-80">Boletim de Progresso</h2>
           <p className="text-3xl font-black">{nomeAluno}</p>
           <p className="text-sm opacity-90">Plataforma Nota A • {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="p-6 sm:p-10 space-y-10">
          
          {/* Seção 1: Esforço */}
          <div className="space-y-4 text-center">
             <div className="text-5xl mb-2">🔥</div>
             <h3 className="text-xl font-bold text-text">Consistência Admirável</h3>
             <p className="text-text-muted">
               {nomeAluno} estudou por <strong className="text-brand-primary text-xl">{streak.diasConsecutivos}</strong> dias seguidos! 
               Manter um ritmo constante é o principal segredo para a aprovação.
             </p>
          </div>

          <div className="h-px w-full bg-border" />

          {/* Seção 2: Desempenho */}
          <div className="space-y-6">
             <h3 className="text-lg font-bold text-text text-center uppercase tracking-widest">Onde está o Foco?</h3>
             
             <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-success/10 p-5 text-center border border-success/20">
                   <div className="text-3xl mb-2">🚀</div>
                   <h4 className="font-bold text-success mb-1">Voando Alto</h4>
                   <p className="text-sm text-text-muted">
                     O maior domínio atual é em <strong className="text-text">{AREA_LABELS[melhorArea] || melhorArea}</strong>.
                   </p>
                </div>
                
                <div className="rounded-xl bg-warning/10 p-5 text-center border border-warning/20">
                   <div className="text-3xl mb-2">💪</div>
                   <h4 className="font-bold text-warning mb-1">Área de Crescimento</h4>
                   <p className="text-sm text-text-muted">
                     O sistema está recomendando mais treinos em <strong className="text-text">{AREA_LABELS[piorArea] || piorArea}</strong>.
                   </p>
                </div>
             </div>
          </div>

          <div className="h-px w-full bg-border" />

          {/* Seção 3: Atividades Extras */}
          <div className="space-y-4 text-center">
             <div className="text-5xl mb-2">🏆</div>
             <h3 className="text-xl font-bold text-text">Além do Básico</h3>
             <p className="text-text-muted">
               Com <strong className="text-brand-primary">{xpTotal} XP</strong> acumulados, 
               já alcançou o <strong className="text-text">Nível {nivel.atual.nivel}</strong>.
             </p>
             <p className="text-text-muted">
               Além das questões normais, completou <strong className="text-text">{atividadesExtras} atividades extras</strong> 
               (incluindo redações enviadas e tutorias particulares com IA).
             </p>
          </div>

        </div>
        
        {/* Footer do Card */}
        <div className="bg-surface-3 p-4 text-center text-xs text-text-muted">
           Este é um relatório gerado automaticamente com base na interação contínua na Plataforma Educacional.
        </div>

      </Card>
    </div>
  );
}

function RelatorioSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-[600px] w-full rounded-2xl" />
    </div>
  );
}
