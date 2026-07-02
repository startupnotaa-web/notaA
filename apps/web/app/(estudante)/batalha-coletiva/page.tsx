'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardResponse } from '@notaa/contracts';
import { Card, SectionHeader, Skeleton, Badge, cn, Button } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';

// Mock list of players in the lobby
const MOCK_PLAYERS = [
  { id: 1, nome: 'Ana Costa', escola: 'Colegio Estadual - SP', nivel: 12 },
  { id: 2, nome: 'Lucas M.', escola: 'ETEC - SP', nivel: 9 },
  { id: 3, nome: 'Sofia R.', escola: 'Colegio Santa Cruz', nivel: 15 },
  { id: 4, nome: 'Pedro Henrique', escola: 'Colegio Objetivo', nivel: 8 },
  { id: 5, nome: 'Julia F.', escola: 'Poliedro', nivel: 22 },
  { id: 6, nome: 'Matheus G.', escola: 'Anglo', nivel: 14 },
];

export default function BatalhaColetivaPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

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
            setErro('Erro ao carregar o Lobby.');
          }
        }
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 1500);
  };

  if (erro) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
        <p className="text-sm text-error">{erro}</p>
      </div>
    );
  }

  if (!data) return <LobbySkeleton />;

  const { perfil, nivel } = data;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <Link href="/dashboard" className="text-sm font-semibold text-brand-primary hover:underline">
            &larr; Voltar ao Painel
          </Link>
          <h1 className="text-3xl font-bold text-text flex items-center gap-3">
            Batalha Coletiva
            <Badge variant="error" className="animate-pulse px-3 py-1 text-xs">AO VIVO</Badge>
          </h1>
          <p className="text-text-muted">Represente sua escola no duelo nacional.</p>
        </div>
        
        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-2 p-4">
           <div className="text-right">
              <p className="text-xs text-text-muted">Seu Perfil</p>
              <p className="font-bold text-text">{perfil.nome || 'Estudante'}</p>
           </div>
           <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/20 text-brand-primary font-black">
              {nivel.atual}
           </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Lado Esquerdo: Lobby e Conexão */}
        <div className="md:col-span-2 space-y-6">
           <Card className="relative overflow-hidden border-brand-primary/30 bg-surface-2 p-6 md:p-10">
              {/* Efeito de Neon de Fundo */}
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-primary/10 blur-[80px] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center justify-center space-y-8 text-center min-h-[250px]">
                 {connected ? (
                   <>
                     <div className="flex flex-col items-center gap-4">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/20 text-success shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                           <span className="text-4xl" aria-hidden="true">✓</span>
                        </div>
                        <h2 className="text-2xl font-black text-text">Conectado ao Servidor</h2>
                        <p className="text-text-muted">Aguardando o Host (Professor) iniciar a partida...</p>
                     </div>
                     <div className="flex gap-2">
                        <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce" />
                        <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce delay-75" />
                        <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce delay-150" />
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="space-y-2">
                        <h2 className="text-3xl font-black text-text">Sessão: Grande Duelo de Exatas</h2>
                        <p className="text-text-muted">Sexta-feira, 15h00. O servidor está aceitando conexões.</p>
                     </div>
                     <Button 
                       size="lg" 
                       onClick={handleConnect} 
                       disabled={connecting}
                       className={cn("w-full max-w-sm text-lg font-bold transition-all", connecting ? "animate-pulse" : "hover:scale-105 hover:shadow-[0_0_20px_rgba(38,153,233,0.4)]")}
                     >
                       {connecting ? 'Conectando...' : 'ENTRAR NO COMBATE'}
                     </Button>
                   </>
                 )}
              </div>
           </Card>

           {/* Regras */}
           <section className="space-y-4">
             <SectionHeader title="Como Funciona" accent="A Batalha" as="h2" />
             <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4 bg-surface/50 border-border">
                  <div className="text-2xl mb-2">⏱️</div>
                  <h3 className="font-bold text-text text-sm">Tempo Limitado</h3>
                  <p className="text-xs text-text-muted mt-1">Responda o mais rápido possível para ganhar bônus de XP.</p>
                </Card>
                <Card className="p-4 bg-surface/50 border-border">
                  <div className="text-2xl mb-2">🔥</div>
                  <h3 className="font-bold text-text text-sm">Combos</h3>
                  <p className="text-xs text-text-muted mt-1">Acertos consecutivos multiplicam a sua pontuação global.</p>
                </Card>
                <Card className="p-4 bg-surface/50 border-border">
                  <div className="text-2xl mb-2">🏆</div>
                  <h3 className="font-bold text-text text-sm">Pódio da Escola</h3>
                  <p className="text-xs text-text-muted mt-1">Os 3 melhores ganham insígnias exclusivas no perfil.</p>
                </Card>
             </div>
           </section>
        </div>

        {/* Lado Direito: Jogadores Online */}
        <div className="space-y-4">
           <div className="flex items-center justify-between">
              <SectionHeader title="Jogadores" accent="no Lobby" as="h2" />
              <Badge variant="neutral" className="text-xs">
                {connected ? MOCK_PLAYERS.length + 1 : MOCK_PLAYERS.length} Online
              </Badge>
           </div>
           
           <Card className="flex flex-col p-2 bg-surface-2/30 border-border max-h-[500px] overflow-y-auto">
             {connected && (
               <div className="flex items-center justify-between p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20 mb-2">
                 <div className="flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                   <div>
                     <p className="text-sm font-bold text-brand-primary">{perfil.nome || 'Você'}</p>
                     <p className="text-[10px] text-text-muted">Sua Escola</p>
                   </div>
                 </div>
                 <div className="text-xs font-black text-brand-primary">Nv {nivel.atual}</div>
               </div>
             )}

             {MOCK_PLAYERS.map(p => (
               <div key={p.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-2 transition-colors">
                 <div className="flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-text-muted/30" />
                   <div>
                     <p className="text-sm font-bold text-text">{p.nome}</p>
                     <p className="text-[10px] text-text-muted">{p.escola}</p>
                   </div>
                 </div>
                 <div className="text-xs font-bold text-text-muted">Nv {p.nivel}</div>
               </div>
             ))}
             
             <div className="p-4 text-center">
               <p className="text-xs text-text-muted">Mais jogadores conectando...</p>
             </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

function LobbySkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4">
      <div className="flex justify-between">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-12 w-32" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Skeleton className="h-[300px] w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
        <div>
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
