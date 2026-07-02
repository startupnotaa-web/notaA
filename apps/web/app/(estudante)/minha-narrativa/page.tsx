'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardResponse, Eixo4D } from '@notaa/contracts';
import { Card, SectionHeader, Skeleton, Badge, cn, Button } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';

const ARQUETIPOS: Record<string, { titulo: string, descricao: string, emoji: string }> = {
  Visual: { titulo: 'O Observador', descricao: 'Você capta o mundo através de imagens e mapas mentais.', emoji: '👁️' },
  Verbal: { titulo: 'O Eloquente', descricao: 'Você tem facilidade em absorver conhecimento através das palavras e textos.', emoji: '🗣️' },
  Analítico: { titulo: 'O Estrategista', descricao: 'Você desconstrói problemas complexos em partes menores e lógicas.', emoji: '🧠' },
  Holístico: { titulo: 'O Visionário', descricao: 'Você enxerga o todo antes das partes, conectando ideias distantes.', emoji: '🌌' },
  Sequencial: { titulo: 'O Metódico', descricao: 'Você aprende melhor seguindo passos claros e processos ordenados.', emoji: '📝' },
  Aleatório: { titulo: 'O Explorador', descricao: 'Sua mente gosta de pular entre conceitos e descobrir caminhos alternativos.', emoji: '🧭' },
  Reflexivo: { titulo: 'O Sábio', descricao: 'Você pondera e avalia todas as opções antes de agir ou responder.', emoji: '🦉' },
  Impulsivo: { titulo: 'O Relâmpago', descricao: 'Você tem raciocínio rápido e aprende melhor testando na prática imediatamente.', emoji: '⚡' },
};

function getArquetipo(eixos: Eixo4D[]) {
  if (!eixos || eixos.length === 0) return ARQUETIPOS.Aleatório;

  let maxMagnitude = -1;
  let dominantPolo = 'Aleatório';

  for (const eixo of eixos) {
    const magnitude = Math.abs(eixo.valor);
    if (magnitude > maxMagnitude && eixo.temSinal) {
      maxMagnitude = magnitude;
      dominantPolo = eixo.valor > 0 ? eixo.poloA : eixo.poloB;
    }
  }

  // Fallback se nenhum eixo tiver sinal forte ainda
  if (maxMagnitude === -1 || maxMagnitude === 0) {
    return { titulo: 'O Iniciante', descricao: 'Seu perfil cognitivo ainda está sendo mapeado.', emoji: '🌱' };
  }

  return ARQUETIPOS[dominantPolo] || ARQUETIPOS.Aleatório;
}

const CURSO_LABEL: Record<string, string> = {
  medicina: 'Medicina',
  direito: 'Direito',
  engenharia: 'Engenharia',
  ti: 'Tecnologia / TI',
  psicologia: 'Psicologia',
  outro: 'Aprovação',
};

export default function MinhaNarrativaPage() {
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
            setErro('Erro ao carregar a Narrativa.');
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

  if (!data) return <NarrativaSkeleton />;

  const { perfil, perfilCognitivo4d, xpTotal, progresso, nivel } = data;
  const arquetipo = getArquetipo(perfilCognitivo4d.eixos);
  const objetivoKey = perfil.objetivoEnem || 'outro';
  const objetivoStr = CURSO_LABEL[objetivoKey] || perfil.objetivoEnem || 'Aprovação';
  const nomeAluno = perfil.nome || 'Estudante';

  // Construir Timeline Dinâmica
  const timeline = [];
  
  if (perfil.onboardingConcluido) {
    timeline.push({
      id: 'onboarding',
      icon: '🚀',
      title: 'O Início da Jornada',
      description: 'Você definiu seu objetivo e deu o primeiro passo na plataforma.',
      date: 'Missão Inicial',
      completed: true,
    });
  }

  if (xpTotal > 0) {
    timeline.push({
      id: 'primeiros-passos',
      icon: '⭐',
      title: 'Despertar do Conhecimento',
      description: `Você já acumulou ${xpTotal} XP respondendo aos nossos desafios e atingiu o Nível ${nivel.atual.nivel}.`,
      date: 'Evolução',
      completed: true,
    });
  } else {
    timeline.push({
      id: 'primeiros-passos',
      icon: '⭐',
      title: 'Despertar do Conhecimento',
      description: 'Acumule XP respondendo aos quizzes para subir de nível.',
      date: 'Próximo Passo',
      completed: false,
    });
  }

  if (progresso.sessoesSocraticas > 0) {
    timeline.push({
      id: 'socratico',
      icon: '🏛️',
      title: 'Diálogos Filosóficos',
      description: `Você já participou de ${progresso.sessoesSocraticas} sessão(ões) Socrática(s), questionando o mundo ao seu redor.`,
      date: 'Aprofundamento',
      completed: true,
    });
  }

  if (progresso.redacoesEnviadas > 0) {
    timeline.push({
      id: 'redacao',
      icon: '✍️',
      title: 'O Poder da Escrita',
      description: `Você enviou ${progresso.redacoesEnviadas} redação(ões) para correção nas 5 competências.`,
      date: 'Expressão',
      completed: true,
    });
  }

  // Missão Final sempre existe
  timeline.push({
    id: 'missao-final',
    icon: '🎓',
    title: `O Grande Sonho: ${objetivoStr}`,
    description: `A linha de chegada. Todo o seu esforço se resume ao momento da aprovação.`,
    date: 'Destino',
    completed: false,
    isFinale: true,
  });


  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4">
      <header className="space-y-2">
        <Link href="/dashboard" className="text-sm font-semibold text-brand-primary hover:underline">
          &larr; Voltar ao Painel
        </Link>
        <h1 className="text-3xl font-bold text-text">Minha Narrativa</h1>
        <p className="text-text-muted">Sua jornada épica rumo à aprovação.</p>
      </header>

      {/* Hero do Arquétipo */}
      <Card className="relative overflow-hidden border-brand-primary/30 bg-gradient-to-br from-surface to-surface-2 p-8 text-center sm:p-12">
         <div className="absolute -right-10 -top-10 text-[150px] opacity-5 pointer-events-none select-none">
           {arquetipo.emoji}
         </div>
         <Badge variant="info" className="mx-auto mb-4 w-fit">Seu Arquétipo Cognitivo</Badge>
         <div className="mb-2 text-6xl" aria-hidden="true">{arquetipo.emoji}</div>
         <h2 className="mb-2 text-4xl font-black tracking-tight text-text">
           {nomeAluno}, <span className="text-brand-primary">{arquetipo.titulo}</span>
         </h2>
         <p className="mx-auto max-w-xl text-lg text-text-muted">
           {arquetipo.descricao}
         </p>
      </Card>

      {/* Timeline */}
      <section className="space-y-6 pt-4">
        <SectionHeader title="Linha do Tempo" accent="Da Jornada" as="h2" />
        
        <div className="relative mx-auto max-w-2xl">
          {/* Linha conectora vertical */}
          <div className="absolute bottom-0 left-[2.25rem] top-0 w-0.5 bg-surface-3 md:left-1/2 md:-ml-[1px]" />
          
          <div className="space-y-8">
            {timeline.map((item, index) => {
              const isEven = index % 2 === 0;
              return (
                <div key={item.id} className={cn("relative flex items-center md:justify-between", isEven ? "md:flex-row-reverse" : "")}>
                  
                  {/* Ponto na linha */}
                  <div className="absolute left-[2.25rem] flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-4 border-surface bg-surface-2 md:left-1/2">
                    <div className={cn("h-3 w-3 rounded-full", item.completed ? (item.isFinale ? "bg-brand-primary animate-pulse" : "bg-success") : "bg-surface-3")} />
                  </div>

                  {/* Espaçador para o layout desktop */}
                  <div className="hidden w-5/12 md:block" />

                  {/* Card de Conteúdo */}
                  <Card className={cn(
                    "ml-[4.5rem] w-full p-5 transition-all md:ml-0 md:w-5/12 hover:-translate-y-1 hover:shadow-md",
                    item.completed ? (item.isFinale ? "border-brand-primary bg-brand-primary/5" : "border-success/30 bg-surface") : "opacity-70 grayscale border-dashed border-border"
                  )}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                      <Badge variant={item.completed ? (item.isFinale ? 'info' : 'success') : 'outline'}>{item.date}</Badge>
                    </div>
                    <h3 className={cn("mb-2 text-lg font-bold", item.completed && !item.isFinale ? "text-success" : "text-text")}>
                      {item.title}
                    </h3>
                    <p className="text-sm text-text-muted">{item.description}</p>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function NarrativaSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-[300px] w-full rounded-2xl" />
      <div className="space-y-4 pt-8">
        <Skeleton className="h-32 w-3/4 md:w-1/2 rounded-xl" />
        <Skeleton className="ml-auto h-32 w-3/4 md:w-1/2 rounded-xl" />
        <Skeleton className="h-32 w-3/4 md:w-1/2 rounded-xl" />
      </div>
    </div>
  );
}
