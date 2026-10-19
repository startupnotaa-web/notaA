'use client';
import { useEffect, useState } from 'react';
import { ClipboardList, Landmark, MessagesSquare, PenLine, Zap } from 'lucide-react';
import type { DashboardResponse } from '@notaa/contracts';
import { Carregando, Notice, PageHeader, Section, Skeleton } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { useUser } from '../../../lib/user-context';
import { Atalho, AtalhoLista } from '../../components/Atalho';
import { Pagina } from '../../components/Pagina';

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
            setErro('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
          } else {
            setErro('Não foi possível carregar os dados de estudo. Tente recarregar a página.');
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
        <Notice tone="danger" title="Não foi possível abrir o estudo">
          {erro}
        </Notice>
      </Pagina>
    );
  }

  if (userLoading || !data) return <EstudoSkeleton />;

  const { progresso } = data;

  return (
    <Pagina>
      <PageHeader
        title="Estudo ativo"
        description="Pratique com ferramentas que se adaptam ao seu ritmo e ao seu cérebro."
      />

      <Section title="Ferramentas de prática">
        <AtalhoLista>
          <Atalho
            icone={<Zap className="h-5 w-5" />}
            titulo="Quiz com IA"
            descricao="Questões personalizadas, focadas nas suas lacunas de conhecimento."
            href="/quiz"
          />
          <Atalho
            icone={<PenLine className="h-5 w-5" />}
            titulo="Redação"
            descricao="Envie textos e receba correções detalhadas nas 5 competências do ENEM."
            metrica={`${progresso.redacoesEnviadas} ${progresso.redacoesEnviadas === 1 ? 'redação enviada' : 'redações enviadas'}`}
            href="/redacao"
          />
          <Atalho
            icone={<ClipboardList className="h-5 w-5" />}
            titulo="Simulado adaptativo"
            descricao="Uma bateria de questões em que a dificuldade se ajusta a cada acerto ou erro."
            href="/simulado"
          />
          <Atalho
            icone={<Landmark className="h-5 w-5" />}
            titulo="Tutor socrático"
            descricao="Converse com uma IA que não dá a resposta pronta: ela guia você a pensar."
            metrica={`${progresso.sessoesSocraticas} ${progresso.sessoesSocraticas === 1 ? 'sessão iniciada' : 'sessões iniciadas'}`}
            href="/tutor"
          />
        </AtalhoLista>
      </Section>

      <Notice tone="info" title="O segredo da retenção">
        Praticar ativamente (quiz e simulado) gera mais retenção do que apenas assistir a videoaulas. Mantenha o foco.
      </Notice>
    </Pagina>
  );
}

function EstudoSkeleton() {
  return (
    <Pagina>
      <Carregando rotulo="Carregando o estudo" className="flex flex-col gap-space-6 md:gap-space-7">
        <div className="flex flex-col gap-space-2">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <div className="flex flex-col gap-space-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Carregando>
    </Pagina>
  );
}
