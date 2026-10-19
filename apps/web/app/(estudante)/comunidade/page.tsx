'use client';
import { useEffect, useState } from 'react';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import type { DashboardResponse } from '@notaa/contracts';
import { Button, Carregando, Chip, Notice, PageHeader, Panel, Section, Skeleton, TextArea, cn } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Pagina } from '../../components/Pagina';
import { Voltar } from '../../components/Voltar';

type Post = {
  id: string;
  autor: string;
  nivel: number;
  conteudo: string;
  tipo: 'dica' | 'conquista' | 'duvida';
  curtidas: number;
  curtidoPorMim: boolean;
  tempoAtras: string;
};

const MOCK_LEADERBOARD = [
  { id: 1, nome: 'Marina S.', xp: 12500, variacao: '+2' },
  { id: 2, nome: 'Você', xp: 0, variacao: '-' }, // Será substituído pelo XP real
  { id: 3, nome: 'Felipe A.', xp: 9800, variacao: '-1' },
];

const INITIAL_POSTS: Post[] = [
  {
    id: 'p1',
    autor: 'Sistema',
    nivel: 99,
    tipo: 'conquista',
    conteudo: 'Lucas M. acabou de atingir o nível 15 e desbloqueou a insígnia "Mestre das Palavras"!',
    curtidas: 12,
    curtidoPorMim: false,
    tempoAtras: '5 min',
  },
  {
    id: 'p2',
    autor: 'Ana Clara',
    nivel: 8,
    tipo: 'dica',
    conteudo: 'Dica de redação: usem conectivos de oposição (entretanto, contudo) no início do D2 para contrapor a ideia do D1. Aumenta muito a nota na C4!',
    curtidas: 45,
    curtidoPorMim: true,
    tempoAtras: '2 horas',
  },
  {
    id: 'p3',
    autor: 'João Pedro',
    nivel: 5,
    tipo: 'duvida',
    conteudo: 'Alguém me ajuda com Estequiometria? Nunca sei quando usar o volume molar na CNTP ou na fórmula de Clapeyron.',
    curtidas: 3,
    curtidoPorMim: false,
    tempoAtras: '4 horas',
  }
];

export default function ComunidadePage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [novoPost, setNovoPost] = useState('');

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
            setErro('Não foi possível carregar a comunidade. Tente recarregar a página.');
          }
        }
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  const handlePostar = () => {
    if (!novoPost.trim() || !data) return;
    
    const post: Post = {
      id: Date.now().toString(),
      autor: data.perfil.nome || 'Estudante',
      nivel: data.nivel.atual,
      tipo: 'dica',
      conteudo: novoPost,
      curtidas: 0,
      curtidoPorMim: false,
      tempoAtras: 'Agora',
    };
    
    setPosts([post, ...posts]);
    setNovoPost('');
  };

  const handleLike = (id: string) => {
    setPosts(posts.map(p => {
      if (p.id === id) {
        return {
          ...p,
          curtidas: p.curtidoPorMim ? p.curtidas - 1 : p.curtidas + 1,
          curtidoPorMim: !p.curtidoPorMim
        };
      }
      return p;
    }));
  };

  if (erro) {
    return (
      <Pagina>
        <Voltar />
        <Notice tone="danger" title="Não foi possível abrir a comunidade">
          {erro}
        </Notice>
      </Pagina>
    );
  }

  if (!data) return <ComunidadeSkeleton />;

  const nomeUsuario = data.perfil.nome || 'Você';

  // Atualiza o XP do usuário no ranking mockado
  const ranking = [...MOCK_LEADERBOARD];
  ranking[1]!.xp = data.xpTotal;
  ranking[1]!.nome = nomeUsuario;
  // Ordena por XP
  ranking.sort((a, b) => b.xp - a.xp);

  return (
    <Pagina largura="media">
      <div className="flex flex-col gap-space-3">
        <Voltar />
        <PageHeader title="Comunidade" description="Conecte-se, tire dúvidas e aprenda com outros estudantes." />
      </div>

      <Panel>
        <div className="flex flex-col gap-space-4">
          <TextArea
            label="Nova publicação"
            placeholder="Compartilhe uma dica, faça uma pergunta ou celebre uma conquista…"
            rows={3}
            value={novoPost}
            onChange={(e) => setNovoPost(e.target.value)}
          />
          <div>
            <Button onClick={handlePostar} disabled={!novoPost.trim()}>
              Publicar
            </Button>
          </div>
        </div>
      </Panel>

      <Section title="Feed">
        <ul className="m-0 flex list-none flex-col p-0">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-col gap-space-3 border-b border-line py-space-5 first:pt-0 last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-space-3">
                <p className="m-0 flex items-center gap-space-3">
                  <span className="text-body font-bold text-ink">{post.autor}</span>
                  {post.tipo !== 'conquista' && <Chip tone="neutral">Nível {post.nivel}</Chip>}
                  <span className="text-caption text-ink-muted">{post.tempoAtras}</span>
                </p>
                {post.tipo === 'duvida' && <Chip tone="warning">Dúvida</Chip>}
                {post.tipo === 'dica' && <Chip tone="success">Dica</Chip>}
                {post.tipo === 'conquista' && <Chip tone="brand">Conquista</Chip>}
              </div>

              <p className="m-0 max-w-texto text-body text-ink">{post.conteudo}</p>

              <div className="flex items-center gap-space-2">
                <Button
                  variant="quiet"
                  size="sm"
                  aria-pressed={post.curtidoPorMim}
                  onClick={() => handleLike(post.id)}
                  className={cn(post.curtidoPorMim && 'bg-violet-tint')}
                >
                  <ThumbsUp aria-hidden="true" className="h-4 w-4" />
                  {post.curtidas} Kudos
                </Button>
                <Button variant="quiet" size="sm">
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  Comentar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Ranking da instituição" divided>
        <ol className="m-0 flex list-none flex-col p-0">
          {ranking.map((user, idx) => (
            <li
              key={user.id}
              className={cn(
                'flex items-center gap-space-4 border-b border-line py-space-3 last:border-b-0',
                user.nome === nomeUsuario && '-mx-space-3 rounded-md bg-violet-tint px-space-3',
              )}
            >
              <span className="w-8 font-display text-heading-3 tabular-nums text-ink-muted">{idx + 1}º</span>
              <span className="flex flex-col">
                <span className={cn('text-body font-bold', user.nome === nomeUsuario ? 'text-primary' : 'text-ink')}>{user.nome}</span>
                <span className="text-caption text-ink-muted">{user.xp.toLocaleString('pt-BR')} XP acumulados</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Regras de ouro" divided>
        <ol className="m-0 flex list-decimal flex-col gap-space-2 pl-space-5 text-body text-ink-muted">
          <li>Respeito acima de tudo.</li>
          <li>Ao responder dúvidas, explique o processo, não dê só a resposta final.</li>
          <li>Celebre as conquistas dos colegas com Kudos.</li>
        </ol>
      </Section>
    </Pagina>
  );
}

function ComunidadeSkeleton() {
  return (
    <Pagina>
      <Carregando rotulo="Carregando a comunidade" className="flex flex-col gap-space-6 md:gap-space-7">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </Carregando>
    </Pagina>
  );
}
