'use client';
import { SectionHeader, Skeleton, Card } from '@notaa/ui';
import { ShortcutCard } from '../../components/ShortcutCard';
import { useUser } from '../../../lib/user-context';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../lib/api-client';
import type { DashboardResponse } from '@notaa/contracts';

export default function EstudoHubPage() {
  const { loading: userLoading } = useUser();
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
            setErro('Erro ao carregar os dados de estudo.');
          }
        }
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  if (erro) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4">
        <p className="text-sm text-error">{erro}</p>
      </div>
    );
  }

  if (userLoading || !data) return <EstudoSkeleton />;

  const { progresso } = data;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-text">Estudo Ativo</h1>
        <p className="text-text-muted">Pratique com ferramentas que se adaptam ao seu ritmo e ao seu cérebro.</p>
      </header>

      <section className="space-y-4">
        <SectionHeader title="Ferramentas" accent="de Prática" as="h2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <ShortcutCard
            icon="⚡"
            title="Quiz com IA"
            description="Questões personalizadas focadas nas suas lacunas de conhecimento."
            href="/quiz"
          />
          <ShortcutCard
            icon="✍️"
            title="Redação"
            description="Envie textos e receba correções detalhadas nas 5 competências do ENEM."
            metric={`${progresso.redacoesEnviadas} redação(ões) enviada(s)`}
            href="/redacao"
          />
          <ShortcutCard
            icon="📊"
            title="Simulado Adaptativo"
            description="Uma bateria de questões onde a dificuldade se ajusta a cada acerto ou erro em tempo real."
            href="/simulado"
          />
          <ShortcutCard
            icon="🏛️"
            title="Tutor Socrático"
            description="Converse com uma IA que não te dá a resposta pronta, mas sim te guia a pensar."
            metric={`${progresso.sessoesSocraticas} sessão(ões) iniciada(s)`}
            href="/tutor"
          />
        </div>
      </section>
      
      <section className="mt-8">
         <Card className="bg-gradient-to-br from-brand-primary/10 to-transparent border-brand-primary/20 p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="text-5xl">🧠</div>
            <div>
               <h3 className="font-bold text-lg text-text">O Segredo da Retenção</h3>
               <p className="text-sm text-text-muted mt-1">
                 Estudos comprovam que praticar ativamente (Quiz, Simulado) gera até <strong className="text-brand-primary">4x mais retenção</strong> do que apenas assistir videoaulas. Mantenha o foco!
               </p>
            </div>
         </Card>
      </section>
    </div>
  );
}

function EstudoSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4">
      <div className="space-y-2">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-5 w-2/3" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
