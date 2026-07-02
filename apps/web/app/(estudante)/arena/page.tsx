'use client';
import { SectionHeader, Skeleton, Card, Badge } from '@notaa/ui';
import { ShortcutCard } from '../../components/ShortcutCard';
import { useUser } from '../../../lib/user-context';
import Link from 'next/link';

export default function ArenaHubPage() {
  const { loading: userLoading, xp } = useUser();

  if (userLoading) return <ArenaSkeleton />;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-text flex items-center gap-3">
            Arena Social <Badge variant="brand" className="text-xs">BETA</Badge>
          </h1>
          <p className="text-text-muted">Aprenda em conjunto, compita de forma saudável e tire dúvidas.</p>
        </div>
        
        <div className="flex flex-col gap-1 text-right">
           <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Seu XP na Arena</span>
           <span className="text-2xl font-black text-brand-primary">{xp.toLocaleString('pt-BR')}</span>
        </div>
      </header>

      <section className="space-y-4">
        <SectionHeader title="Modos de" accent="Competição" as="h2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <ShortcutCard
            icon="⚔️"
            title="Modo Batalha PvP"
            description="Enfrente o fantasma de outro aluno do seu nível em um duelo rápido de 5 questões."
            href="/batalha"
          />
          <ShortcutCard
            icon="🏟️"
            title="Batalha Coletiva"
            description="Lobby ao vivo para competições massivas (Escola vs Escola). Eventos marcados."
            href="/batalha-coletiva"
          />
        </div>
      </section>

      <section className="space-y-4 pt-4 border-t border-border/50">
        <SectionHeader title="Fórum e" accent="Interação" as="h2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <ShortcutCard
            icon="👥"
            title="Comunidade"
            description="Tire dúvidas pontuais, compartilhe macetes e veja as conquistas dos seus amigos."
            href="/comunidade"
          />
        </div>
      </section>
      
      <section className="mt-8">
         <Card className="bg-surface-2/30 border-dashed border-border p-6 flex items-center gap-4">
            <div className="text-4xl grayscale opacity-50">🏆</div>
            <div>
               <h3 className="font-bold text-text-muted">Ranking Global</h3>
               <p className="text-sm text-text-muted/70">O Ranking da sua cidade estará disponível na próxima atualização de fim de mês.</p>
            </div>
         </Card>
      </section>
    </div>
  );
}

function ArenaSkeleton() {
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
      </div>
    </div>
  );
}
