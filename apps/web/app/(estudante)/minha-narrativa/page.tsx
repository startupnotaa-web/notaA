'use client';
import { useEffect, useState } from 'react';
import { Brain, Compass, Eye, GraduationCap, Landmark, ListOrdered, MessageCircle, Orbit, PenLine, Rocket, Scale, Sprout, Star, Zap, type LucideIcon } from 'lucide-react';
import type { DashboardResponse, Eixo4D } from '@notaa/contracts';
import { Carregando, Chip, Notice, PageHeader, Section, Skeleton, cn } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Pagina } from '../../components/Pagina';
import { Voltar } from '../../components/Voltar';

const ARQUETIPOS: Record<string, { titulo: string; descricao: string; Icone: LucideIcon }> = {
  Visual: { titulo: 'O Observador', descricao: 'Você capta o mundo através de imagens e mapas mentais.', Icone: Eye },
  Verbal: { titulo: 'O Eloquente', descricao: 'Você tem facilidade em absorver conhecimento através das palavras e textos.', Icone: MessageCircle },
  Analítico: { titulo: 'O Estrategista', descricao: 'Você desconstrói problemas complexos em partes menores e lógicas.', Icone: Brain },
  Holístico: { titulo: 'O Visionário', descricao: 'Você enxerga o todo antes das partes, conectando ideias distantes.', Icone: Orbit },
  Sequencial: { titulo: 'O Metódico', descricao: 'Você aprende melhor seguindo passos claros e processos ordenados.', Icone: ListOrdered },
  Aleatório: { titulo: 'O Explorador', descricao: 'Sua mente gosta de pular entre conceitos e descobrir caminhos alternativos.', Icone: Compass },
  Reflexivo: { titulo: 'O Sábio', descricao: 'Você pondera e avalia todas as opções antes de agir ou responder.', Icone: Scale },
  Impulsivo: { titulo: 'O Relâmpago', descricao: 'Você tem raciocínio rápido e aprende melhor testando na prática imediatamente.', Icone: Zap },
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
    return { titulo: 'O Iniciante', descricao: 'Seu perfil cognitivo ainda está sendo mapeado.', Icone: Sprout };
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
            setErro('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
          } else {
            setErro('Não foi possível carregar a narrativa. Tente recarregar a página.');
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
        <Notice tone="danger" title="Não foi possível abrir a narrativa">
          {erro}
        </Notice>
      </Pagina>
    );
  }

  if (!data) return <NarrativaSkeleton />;

  const { perfil, perfilCognitivo4d, xpTotal, progresso, nivel } = data;
  const arquetipo = getArquetipo(perfilCognitivo4d.eixos);
  const objetivoKey = perfil.objetivoEnem || 'outro';
  const objetivoStr = CURSO_LABEL[objetivoKey] || perfil.objetivoEnem || 'Aprovação';
  const nomeAluno = perfil.nome || 'Estudante';

  // Construir linha do tempo dinâmica
  const timeline: {
    id: string;
    Icone: LucideIcon;
    title: string;
    description: string;
    date: string;
    completed: boolean;
    isFinale?: boolean;
  }[] = [];

  if (perfil.onboardingConcluido) {
    timeline.push({
      id: 'onboarding',
      Icone: Rocket,
      title: 'O início da jornada',
      description: 'Você definiu seu objetivo e deu o primeiro passo na plataforma.',
      date: 'Missão inicial',
      completed: true,
    });
  }

  if (xpTotal > 0) {
    timeline.push({
      id: 'primeiros-passos',
      Icone: Star,
      title: 'Despertar do conhecimento',
      description: `Você já acumulou ${xpTotal} XP respondendo aos desafios e chegou ao nível ${nivel.atual}.`,
      date: 'Evolução',
      completed: true,
    });
  } else {
    timeline.push({
      id: 'primeiros-passos',
      Icone: Star,
      title: 'Despertar do conhecimento',
      description: 'Acumule XP respondendo aos quizzes para subir de nível.',
      date: 'Próximo passo',
      completed: false,
    });
  }

  if (progresso.sessoesSocraticas > 0) {
    timeline.push({
      id: 'socratico',
      Icone: Landmark,
      title: 'Diálogos filosóficos',
      description: `Você já participou de ${progresso.sessoesSocraticas} ${progresso.sessoesSocraticas === 1 ? 'sessão socrática' : 'sessões socráticas'}, questionando o mundo ao seu redor.`,
      date: 'Aprofundamento',
      completed: true,
    });
  }

  if (progresso.redacoesEnviadas > 0) {
    timeline.push({
      id: 'redacao',
      Icone: PenLine,
      title: 'O poder da escrita',
      description: `Você enviou ${progresso.redacoesEnviadas} ${progresso.redacoesEnviadas === 1 ? 'redação' : 'redações'} para correção nas 5 competências.`,
      date: 'Expressão',
      completed: true,
    });
  }

  // Missão final sempre existe
  timeline.push({
    id: 'missao-final',
    Icone: GraduationCap,
    title: `O grande sonho: ${objetivoStr}`,
    description: 'A linha de chegada. Todo o seu esforço se resume ao momento da aprovação.',
    date: 'Destino',
    completed: false,
    isFinale: true,
  });

  const IconeDoArquetipo = arquetipo?.Icone ?? Orbit;

  return (
    <Pagina>
      <div className="flex flex-col gap-space-3">
        <Voltar />
        <PageHeader title="Minha narrativa" description="Sua jornada rumo à aprovação." />
      </div>

      <Section divided>
        <div className="flex items-start gap-space-5">
          <span aria-hidden="true" className="inline-flex h-14 w-14 flex-none items-center justify-center rounded-pill bg-violet-tint text-primary">
            <IconeDoArquetipo className="h-7 w-7" />
          </span>
          <div className="flex flex-col gap-space-2">
            <div>
              <Chip tone="info">Seu arquétipo cognitivo</Chip>
            </div>
            <h2 className="m-0 font-display text-heading-1 text-ink">
              {nomeAluno}, <span className="text-primary">{arquetipo?.titulo}</span>
            </h2>
            <p className="m-0 max-w-texto text-body text-ink-muted">{arquetipo?.descricao}</p>
          </div>
        </div>
      </Section>

      <Section title="Linha do tempo da jornada" divided>
        <ol className="m-0 flex list-none flex-col p-0">
          {timeline.map((item, index) => (
            <li key={item.id} className="flex gap-space-4">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex h-9 w-9 flex-none items-center justify-center rounded-pill',
                    item.completed ? 'bg-success-tint text-success' : item.isFinale ? 'bg-violet-tint text-primary' : 'bg-surface-sunken text-ink-muted',
                  )}
                >
                  <item.Icone className="h-5 w-5" />
                </span>
                {index < timeline.length - 1 ? <span aria-hidden="true" className="w-px flex-1 bg-line" /> : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-space-2 pb-space-6">
                <div className="flex flex-wrap items-center gap-space-3 pt-1">
                  <h3 className="m-0 font-display text-heading-3 text-ink">{item.title}</h3>
                  <Chip tone={item.completed ? 'success' : item.isFinale ? 'brand' : 'neutral'}>
                    {item.completed ? 'Concluído' : item.date}
                  </Chip>
                </div>
                <p className="m-0 max-w-texto text-body text-ink-muted">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </Pagina>
  );
}

function NarrativaSkeleton() {
  return (
    <Pagina>
      <Carregando rotulo="Carregando a narrativa" className="flex flex-col gap-space-6 md:gap-space-7">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </Carregando>
    </Pagina>
  );
}
