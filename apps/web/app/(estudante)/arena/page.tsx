'use client';
import { Landmark, Swords, Users } from 'lucide-react';
import { Carregando, Chip, Inset, PageHeader, Section, Skeleton } from '@notaa/ui';
import { useUser } from '../../../lib/user-context';
import { Atalho, AtalhoLista } from '../../components/Atalho';
import { Pagina } from '../../components/Pagina';

export default function ArenaHubPage() {
  const { loading: userLoading, xp } = useUser();

  if (userLoading) return <ArenaSkeleton />;

  return (
    <Pagina>
      <PageHeader
        title="Arena social"
        status={<Chip tone="brand">Beta</Chip>}
        description="Aprenda em conjunto, compita de forma saudável e tire dúvidas."
        actions={
          <p className="m-0 text-right">
            <span className="block text-caption text-ink-muted">Seu XP na arena</span>
            <span className="font-display text-figure tabular-nums text-primary">{xp.toLocaleString('pt-BR')}</span>
          </p>
        }
      />

      <Section title="Modos de competição">
        <AtalhoLista>
          {/* ATENÇÃO ao religar a Arena (lib/feature-flags.ts): a rota /batalha
              NUNCA existiu em app/(estudante)/ — este atalho leva a um 404. A
              tela do duelo precisa ser criada antes de a Arena voltar ao ar; a
              API correspondente já existe em POST /battle/matchmake. */}
          <Atalho
            icone={<Swords className="h-5 w-5" />}
            titulo="Modo batalha PvP"
            descricao="Enfrente o fantasma de outro aluno do seu nível em um duelo rápido de 5 questões."
            href="/batalha"
          />
          <Atalho
            icone={<Landmark className="h-5 w-5" />}
            titulo="Batalha coletiva"
            descricao="Lobby ao vivo para competições em massa (instituição contra instituição), em eventos marcados."
            href="/batalha-coletiva"
          />
        </AtalhoLista>
      </Section>

      <Section title="Fórum e interação" divided>
        <AtalhoLista>
          <Atalho
            icone={<Users className="h-5 w-5" />}
            titulo="Comunidade"
            descricao="Tire dúvidas pontuais, compartilhe macetes e veja as conquistas dos seus amigos."
            href="/comunidade"
          />
        </AtalhoLista>
      </Section>

      <Inset>
        <p className="m-0 text-body font-bold text-ink">Ranking global</p>
        <p className="m-0 text-body-sm text-ink-muted">
          O ranking da sua cidade estará disponível na próxima atualização de fim de mês.
        </p>
      </Inset>
    </Pagina>
  );
}

function ArenaSkeleton() {
  return (
    <Pagina>
      <Carregando rotulo="Carregando a arena" className="flex flex-col gap-space-6 md:gap-space-7">
        <div className="flex flex-col gap-space-2">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </Carregando>
    </Pagina>
  );
}
