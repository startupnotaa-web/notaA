'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardResponse } from '@notaa/contracts';
import { Card, SectionHeader, Skeleton, Badge, cn, Button } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';

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
    conteudo: '🎉 Lucas M. acabou de atingir o Nível 15 e desbloqueou a insígnia "Mestre das Palavras"!',
    curtidas: 12,
    curtidoPorMim: false,
    tempoAtras: '5 min',
  },
  {
    id: 'p2',
    autor: 'Ana Clara',
    nivel: 8,
    tipo: 'dica',
    conteudo: 'Dica de Redação: Usem conectivos de oposição (entretanto, contudo) no início do D2 para contrapor a ideia do D1. Aumenta muito a nota na C4! ✍️',
    curtidas: 45,
    curtidoPorMim: true,
    tempoAtras: '2 horas',
  },
  {
    id: 'p3',
    autor: 'João Pedro',
    nivel: 5,
    tipo: 'duvida',
    conteudo: 'Alguém me ajuda com Estequiometria? Nunca sei quando usar o volume molar na CNTP ou na fórmula de Clapeyron 😭',
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
            setErro('Sem conexão com o servidor.');
          } else {
            setErro('Erro ao carregar a Comunidade.');
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
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
        <p className="text-sm text-error">{erro}</p>
      </div>
    );
  }

  if (!data) return <ComunidadeSkeleton />;

  const nomeCurto = data.perfil.nome ? data.perfil.nome.split(' ')[0] : 'Você';
  
  // Atualiza o XP do usuário no ranking mockado
  const ranking = [...MOCK_LEADERBOARD];
  ranking[1]!.xp = data.xpTotal;
  ranking[1]!.nome = data.perfil.nome || 'Você';
  // Ordena por XP
  ranking.sort((a, b) => b.xp - a.xp);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <Link href="/dashboard" className="text-sm font-semibold text-brand-primary hover:underline">
            &larr; Voltar ao Painel
          </Link>
          <h1 className="text-3xl font-bold text-text">Comunidade</h1>
          <p className="text-text-muted">Conecte-se, tire dúvidas e aprenda com outros estudantes.</p>
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Lado Esquerdo: Feed principal */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Caixa de Criação de Post */}
          <Card className="p-4 bg-surface-2 border-border shadow-sm">
            <div className="flex gap-4">
               <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/20 text-brand-primary font-bold">
                  {nomeCurto?.charAt(0)}
               </div>
               <div className="flex-1 space-y-3">
                  <textarea 
                    placeholder="Compartilhe uma dica, faça uma pergunta ou celebre uma conquista..." 
                    className="w-full resize-none rounded-lg bg-surface p-3 text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                    rows={3}
                    value={novoPost}
                    onChange={(e) => setNovoPost(e.target.value)}
                  />
                  <div className="flex justify-end">
                     <Button onClick={handlePostar} disabled={!novoPost.trim()}>
                        Postar
                     </Button>
                  </div>
               </div>
            </div>
          </Card>

          {/* Lista de Posts (Feed) */}
          <div className="space-y-4">
            {posts.map(post => (
              <Card key={post.id} className={cn("p-5 transition-colors hover:bg-surface-2/50", post.tipo === 'conquista' ? 'border-brand-primary/30 bg-brand-primary/5' : 'border-border bg-surface-2')}>
                 <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                       <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold", 
                         post.tipo === 'conquista' ? 'bg-brand-primary text-brand-primary-foreground' : 'bg-surface-3 text-text-muted'
                       )}>
                         {post.autor === 'Sistema' ? '🏆' : post.autor.charAt(0)}
                       </div>
                       <div>
                         <p className="font-bold text-text text-sm flex items-center gap-2">
                           {post.autor}
                           {post.tipo !== 'conquista' && (
                             <Badge variant="neutral" className="text-[10px] py-0">Nv {post.nivel}</Badge>
                           )}
                         </p>
                         <p className="text-[10px] text-text-muted">{post.tempoAtras}</p>
                       </div>
                    </div>
                    {post.tipo === 'duvida' && <Badge variant="warning" className="text-[10px]">Dúvida</Badge>}
                    {post.tipo === 'dica' && <Badge variant="success" className="text-[10px]">Dica</Badge>}
                 </div>
                 
                 <p className={cn("text-sm leading-relaxed mb-4", post.tipo === 'conquista' && 'font-semibold text-brand-primary')}>
                   {post.conteudo}
                 </p>
                 
                 <div className="flex items-center gap-4 border-t border-border pt-3">
                    <button 
                      onClick={() => handleLike(post.id)}
                      className={cn("flex items-center gap-1.5 text-xs font-semibold transition-colors", 
                        post.curtidoPorMim ? 'text-brand-primary' : 'text-text-muted hover:text-text'
                      )}
                    >
                      <span className={cn("text-lg", post.curtidoPorMim && "animate-bounce")}>
                        {post.curtidoPorMim ? '🔥' : '👍'}
                      </span>
                      {post.curtidas} {post.curtidas === 1 ? 'Kudos' : 'Kudos'}
                    </button>
                    
                    <button className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors">
                      <span className="text-lg">💬</span> Comentar
                    </button>
                 </div>
              </Card>
            ))}
          </div>

        </div>

        {/* Lado Direito: Leaderboard e Widgets */}
        <div className="space-y-6">
           {/* Leaderboard */}
           <section>
             <SectionHeader title="Ranking" accent="da Escola" as="h2" />
             <Card className="flex flex-col p-2 bg-surface-2/30 border-border">
               {ranking.map((user, idx) => (
                 <div key={user.id} className={cn("flex items-center justify-between p-3 rounded-lg transition-colors", 
                   user.nome === (data.perfil.nome || 'Você') ? 'bg-brand-primary/10 border border-brand-primary/20' : 'hover:bg-surface-2'
                 )}>
                   <div className="flex items-center gap-3">
                     <span className={cn("text-lg font-black w-5 text-center", 
                       idx === 0 ? 'text-warning' : idx === 1 ? 'text-text-muted' : idx === 2 ? 'text-orange-400' : 'text-surface-3'
                     )}>
                       {idx + 1}º
                     </span>
                     <div>
                       <p className={cn("text-sm font-bold", user.nome === (data.perfil.nome || 'Você') ? 'text-brand-primary' : 'text-text')}>{user.nome}</p>
                       <p className="text-[10px] text-text-muted">{user.xp} XP acumulados</p>
                     </div>
                   </div>
                 </div>
               ))}
               <div className="p-3 text-center border-t border-border mt-2">
                 <Link href="#" className="text-xs text-brand-primary hover:underline">Ver ranking completo</Link>
               </div>
             </Card>
           </section>

           {/* Regras da Comunidade */}
           <Card className="p-5 bg-surface-2/50 border-dashed border-border text-sm">
             <h3 className="font-bold text-text mb-2">Regras de Ouro 📜</h3>
             <ul className="space-y-2 text-text-muted">
               <li><strong className="text-text">1.</strong> Respeito acima de tudo.</li>
               <li><strong className="text-text">2.</strong> Ao responder dúvidas, explique o processo, não dê apenas a resposta final.</li>
               <li><strong className="text-text">3.</strong> Celebre as conquistas dos colegas com Kudos (🔥).</li>
             </ul>
           </Card>
        </div>
      </div>
    </div>
  );
}

function ComunidadeSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4">
      <Skeleton className="h-10 w-1/3" />
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
        <div>
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
